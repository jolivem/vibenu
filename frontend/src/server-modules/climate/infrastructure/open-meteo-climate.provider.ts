import type { ClimateNormales, ClimateProvider } from "./climate.provider";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

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
export class OpenMeteoClimateProvider implements ClimateProvider {
  // Précision 1 décimale (~11 km) — suffisant car la grille ERA5 est ~25 km.
  // Maximise le hit rate puisque les communes voisines partagent la même réponse.
  private static cache = new InMemoryCache<ClimateNormales | null>(THIRTY_DAYS);
  private static readonly CACHE_PRECISION = 1;
  private readonly baseUrl = "https://archive-api.open-meteo.com/v1/archive";
  private readonly startYear = 1991;
  private readonly endYear = 2020;

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

      const response = await fetch(url, {
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
      console.warn("Open-Meteo climate provider error:", error);
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
