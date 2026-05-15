import type { ClimateNormales, ClimateProvider } from "./climate.provider";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";
import { ClimateNationalRepository } from "./climate-national.repository";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;

/**
 * 12 villes réparties sur le territoire métropolitain (N/S/E/O + centre).
 * Sert au calcul de la moyenne France via la même méthode Open-Meteo
 * que pour les points locaux (cohérence statistique).
 */
const FRANCE_SAMPLE_CITIES: ReadonlyArray<readonly [number, number, string]> = [
  [48.85, 2.35, "Paris"],
  [43.30, 5.40, "Marseille"],
  [45.75, 4.83, "Lyon"],
  [43.60, 1.43, "Toulouse"],
  [43.70, 7.27, "Nice"],
  [47.22, -1.55, "Nantes"],
  [48.58, 7.75, "Strasbourg"],
  [50.63, 3.06, "Lille"],
  [44.84, -0.58, "Bordeaux"],
  [48.39, -4.49, "Brest"],
  [45.78, 3.08, "Clermont-Ferrand"],
  [49.26, 4.03, "Reims"],
];
const FETCH_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface OpenMeteoArchiveResponse {
  daily?: {
    time?: string[];
    temperature_2m_mean?: (number | null)[];
    precipitation_sum?: (number | null)[];
    sunshine_duration?: (number | null)[]; // en secondes
  };
}

/**
 * Climate provider using Open-Meteo's Historical Weather API (ERA5 reanalysis).
 *
 * On récupère les valeurs quotidiennes 1991-2020 (~11 000 jours), puis on calcule :
 *  - température moyenne (moyenne arithmétique des moyennes journalières)
 *  - précipitations annuelles moyennes (somme totale / 30 ans)
 *  - ensoleillement annuel moyen (somme des durées en heures / 30 ans)
 *
 * https://open-meteo.com/en/docs/historical-weather-api
 * Pas d'API key requise, licence CC-BY 4.0.
 */
/** Délai entre requêtes séquentielles pour respecter le rate-limit d'Open-Meteo. */
const INTER_REQUEST_DELAY_MS = 3000;
/** Nombre minimum de villes valides pour considérer la moyenne nationale fiable. */
const MIN_VALID_CITIES = 6;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class OpenMeteoClimateProvider implements ClimateProvider {
  // Précision 1 décimale (~11 km) — suffisant car la grille ERA5 est ~25 km.
  // Maximise le hit rate puisque les communes voisines partagent la même réponse.
  private static cache = new InMemoryCache<ClimateNormales | null>(THIRTY_DAYS);
  /** Cache de la moyenne France — données historiques fixes, TTL 1 an */
  private static nationalCache = new InMemoryCache<ClimateNormales>(ONE_YEAR);
  /** Singleflight : une seule agrégation simultanée même si plusieurs requêtes arrivent */
  private static nationalInflight: Promise<ClimateNormales | null> | null = null;
  private static readonly CACHE_PRECISION = 1;
  private static readonly NATIONAL_CACHE_KEY = "france";
  private readonly baseUrl = "https://archive-api.open-meteo.com/v1/archive";
  private readonly startYear = 1991;
  private readonly endYear = 2020;
  private readonly nationalRepo = new ClimateNationalRepository();

  async getNationalNormales(): Promise<ClimateNormales | null> {
    // 1. Cache mémoire (hot path)
    const cached = OpenMeteoClimateProvider.nationalCache.get(
      OpenMeteoClimateProvider.NATIONAL_CACHE_KEY,
    );
    if (cached !== undefined) return cached;

    // 2. Postgres (survit aux restarts — pré-populé idéalement via le script offline)
    const persisted = await this.nationalRepo.get();
    if (persisted) {
      OpenMeteoClimateProvider.nationalCache.set(
        OpenMeteoClimateProvider.NATIONAL_CACHE_KEY,
        persisted,
      );
      return persisted;
    }

    // 3. Agrégation API en dernier recours, avec singleflight
    if (OpenMeteoClimateProvider.nationalInflight) {
      return OpenMeteoClimateProvider.nationalInflight;
    }
    OpenMeteoClimateProvider.nationalInflight = this.computeNationalNormales().finally(() => {
      OpenMeteoClimateProvider.nationalInflight = null;
    });
    return OpenMeteoClimateProvider.nationalInflight;
  }

  private async computeNationalNormales(): Promise<ClimateNormales | null> {
    const valid: ClimateNormales[] = [];
    for (let i = 0; i < FRANCE_SAMPLE_CITIES.length; i++) {
      const [lat, lon, name] = FRANCE_SAMPLE_CITIES[i];
      const r = await this.getNormales(lat, lon);
      if (r) {
        valid.push(r);
      } else {
        console.warn(`[climate] national sample point failed: ${name} (${lat}, ${lon})`);
      }
      // Délai entre requêtes pour respecter le rate-limit (saut après la dernière).
      if (i < FRANCE_SAMPLE_CITIES.length - 1) {
        await sleep(INTER_REQUEST_DELAY_MS);
      }
    }

    if (valid.length < MIN_VALID_CITIES) {
      console.warn(
        `[climate] national aggregation failed: only ${valid.length}/${FRANCE_SAMPLE_CITIES.length} cities returned data`,
      );
      // Ne PAS mettre en cache un échec : le prochain visiteur pourra retenter.
      return null;
    }

    const sum = valid.reduce<{ temperatureC: number; precipitationMm: number; sunshineHours: number }>(
      (acc, c) => ({
        temperatureC: acc.temperatureC + (c.temperatureC ?? 0),
        precipitationMm: acc.precipitationMm + (c.precipitationMm ?? 0),
        sunshineHours: acc.sunshineHours + (c.sunshineHours ?? 0),
      }),
      { temperatureC: 0, precipitationMm: 0, sunshineHours: 0 },
    );
    const avg: ClimateNormales = {
      temperatureC: Math.round((sum.temperatureC / valid.length) * 10) / 10,
      precipitationMm: Math.round(sum.precipitationMm / valid.length),
      sunshineHours: Math.round(sum.sunshineHours / valid.length),
    };
    OpenMeteoClimateProvider.nationalCache.set(OpenMeteoClimateProvider.NATIONAL_CACHE_KEY, avg);
    // Persistance Postgres : le prochain restart n'aura pas besoin de réinterroger l'API.
    await this.nationalRepo.set(avg, {
      periodStart: this.startYear,
      periodEnd: this.endYear,
      source: `open-meteo-${FRANCE_SAMPLE_CITIES.length}-cities`,
      sampleCount: valid.length,
    });
    console.log(
      `[climate] national normales computed from ${valid.length} cities (saved to DB):`,
      avg,
    );
    return avg;
  }

  async getNormales(lat: number, lon: number): Promise<ClimateNormales | null> {
    const cacheKey = buildGeoKey(lat, lon, OpenMeteoClimateProvider.CACHE_PRECISION);
    const cached = OpenMeteoClimateProvider.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const url =
        `${this.baseUrl}` +
        `?latitude=${lat.toFixed(2)}` +
        `&longitude=${lon.toFixed(2)}` +
        `&start_date=${this.startYear}-01-01` +
        `&end_date=${this.endYear}-12-31` +
        `&daily=temperature_2m_mean,precipitation_sum,sunshine_duration` +
        `&timezone=Europe%2FParis`;

      const response = await fetchWithTimeout(url, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        console.warn(`Open-Meteo climate API error: ${response.status}`);
        OpenMeteoClimateProvider.cache.set(cacheKey, null);
        return null;
      }

      const data = (await response.json()) as OpenMeteoArchiveResponse;
      const result = this.computeNormales(data);
      OpenMeteoClimateProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      const cause = (error as { cause?: { code?: string } })?.cause?.code;
      const isNetwork = error instanceof Error
        && (error.name === "AbortError"
          || cause === "UND_ERR_CONNECT_TIMEOUT"
          || cause === "ETIMEDOUT"
          || cause === "ENOTFOUND"
          || cause === "ECONNREFUSED");
      if (isNetwork) {
        console.info(`Open-Meteo climate API unreachable (${cause ?? error.name}) — using fallback`);
      } else {
        console.warn("Open-Meteo climate provider error:", error);
      }
      return null;
    }
  }

  private computeNormales(data: OpenMeteoArchiveResponse): ClimateNormales | null {
    const daily = data.daily;
    if (!daily?.time || daily.time.length === 0) return null;

    const temps = daily.temperature_2m_mean ?? [];
    const precip = daily.precipitation_sum ?? [];
    const sunshine = daily.sunshine_duration ?? [];

    const n = daily.time.length;
    const years = this.endYear - this.startYear + 1;

    // Température : moyenne arithmétique des moyennes journalières
    let tempSum = 0;
    let tempCount = 0;
    for (let i = 0; i < n; i++) {
      const v = temps[i];
      if (v != null && Number.isFinite(v)) {
        tempSum += v;
        tempCount++;
      }
    }
    const temperatureC = tempCount > 0 ? tempSum / tempCount : 0;

    // Précipitations : somme totale / 30 ans = moyenne annuelle
    let precipTotal = 0;
    for (const v of precip) {
      if (v != null && Number.isFinite(v)) precipTotal += v;
    }
    const precipitationMm = precipTotal / years;

    // Ensoleillement : durée totale (secondes) / 3600 / 30 ans = heures/an
    let sunshineTotalSeconds = 0;
    for (const v of sunshine) {
      if (v != null && Number.isFinite(v)) sunshineTotalSeconds += v;
    }
    const sunshineHours = sunshineTotalSeconds / 3600 / years;

    return {
      temperatureC: Math.round(temperatureC * 10) / 10,
      precipitationMm: Math.round(precipitationMm),
      sunshineHours: Math.round(sunshineHours),
    };
  }
}
