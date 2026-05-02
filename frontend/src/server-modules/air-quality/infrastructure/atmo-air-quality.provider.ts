import type { AirQualityData, AirQualityHistoryDay } from "../domain/air-quality.types";
import type { AirQualityProvider } from "../application/air-quality.service";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";

const SIX_HOURS = 6 * 60 * 60 * 1000;
const TOKEN_TTL_MS = 55 * 60 * 1000;

interface AtmoProperties {
  date_ech?: string;
  date_maj?: string;
  code_qual: number;
  lib_qual?: string;
  source?: string;
  code_no2?: number;
  code_o3?: number;
  code_pm10?: number;
  code_pm25?: number;
  code_so2?: number;
}

interface AtmoGeoJson {
  features?: Array<{ properties: AtmoProperties }>;
}

export class AtmoAirQualityProvider implements AirQualityProvider {
  private static cache = new InMemoryCache<AirQualityData>(SIX_HOURS);
  private static token: { value: string; expiresAt: number } | null = null;
  private static tokenPromise: Promise<string> | null = null;

  private readonly username = process.env.ATMO_USERNAME ?? "";
  private readonly password = process.env.ATMO_PASSWORD ?? "";
  private readonly baseUrl = "https://admindata.atmo-france.org";

  async getAirQuality(lat: number, lon: number, codeInsee?: string): Promise<AirQualityData> {
    const debug = process.env.NEXT_PUBLIC_DEBUG === "true";
    const cacheKey = buildGeoKey(lat, lon);

    if (!debug) {
      const cached = AtmoAirQualityProvider.cache.get(cacheKey);
      if (cached) return cached;
    }

    if (!this.username || !this.password) {
      return this.getFallbackData("Identifiants Atmo non configurés");
    }
    if (!codeInsee) {
      return this.getFallbackData("Code INSEE non disponible");
    }

    try {
      // Filtre = 7 jours en arrière jusqu'à aujourd'hui (les jours futurs/prévisions
      // sont tolérés mais on prend le jour courant comme référence).
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const sevenDaysAgo = new Date(today.getTime() - 7 * 86400_000)
        .toISOString()
        .split("T")[0];

      const filter = JSON.stringify({
        code_zone: { operator: "=", value: codeInsee },
        date_ech: { operator: ">=", value: sevenDaysAgo },
      });
      const url = `${this.baseUrl}/api/data/112/${encodeURIComponent(filter)}?withGeom=false`;

      const response = await this.fetchWithAuth(url);
      if (!response.ok) {
        console.warn(`Atmo API error: ${response.status}`);
        return this.getFallbackData("API Atmo indisponible");
      }

      const data = (await response.json()) as AtmoGeoJson;
      const features = data.features ?? [];

      // Construit l'historique : un point par jour, du plus ancien au plus récent.
      const byDate = new Map<string, AtmoProperties>();
      for (const f of features) {
        const d = f.properties?.date_ech?.slice(0, 10);
        if (!d) continue;
        // En cas de doublon (forecast vs observé), garde le plus récent (date_maj).
        const existing = byDate.get(d);
        if (!existing) byDate.set(d, f.properties);
        else {
          const e = (existing.date_maj ?? "") > (f.properties.date_maj ?? "") ? existing : f.properties;
          byDate.set(d, e);
        }
      }

      const history: AirQualityHistoryDay[] = Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .filter(([d]) => d <= todayStr) // on garde uniquement passé + aujourd'hui
        .map(([d, p]) => {
          const m = this.mapAtmoData(p);
          return { date: d, level: m.level, aqi: m.aqi };
        });

      // Référence "jour courant" : aujourd'hui si présent, sinon le plus récent passé,
      // sinon le 1er feature retourné.
      const todayProps =
        features.find((f) => f.properties?.date_ech?.startsWith(todayStr))?.properties ??
        (history.length > 0
          ? features.find(
              (f) => f.properties?.date_ech?.startsWith(history[history.length - 1].date),
            )?.properties
          : undefined) ??
        features[0]?.properties;

      if (!todayProps) {
        return this.getFallbackData("Aucun indice disponible");
      }

      const result = this.mapAtmoData(todayProps);
      result.history = history;

      if (debug) {
        result.debugRaw = {
          codeInsee,
          requestedRange: { from: sevenDaysAgo, to: todayStr },
          allFeatures: features.map((f) => f.properties),
          selectedFeature: todayProps,
          history,
        };
      } else {
        AtmoAirQualityProvider.cache.set(cacheKey, result);
      }
      return result;
    } catch (error) {
      console.warn("Atmo provider error:", error);
      return this.getFallbackData("Erreur API Atmo");
    }
  }

  private async fetchWithAuth(url: string): Promise<Response> {
    const token = await this.getToken();
    const doFetch = (t: string) =>
      fetch(url, {
        headers: { Accept: "application/json", Authorization: `Bearer ${t}` },
      });
    const response = await doFetch(token);
    if (response.status !== 401) return response;
    AtmoAirQualityProvider.token = null;
    return doFetch(await this.getToken());
  }

  private async getToken(): Promise<string> {
    const cached = AtmoAirQualityProvider.token;
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (!AtmoAirQualityProvider.tokenPromise) {
      AtmoAirQualityProvider.tokenPromise = this.login().finally(() => {
        AtmoAirQualityProvider.tokenPromise = null;
      });
    }
    return AtmoAirQualityProvider.tokenPromise;
  }

  private async login(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: this.username, password: this.password }),
    });
    if (!response.ok) {
      throw new Error(`Atmo login failed: ${response.status}`);
    }
    const { token } = (await response.json()) as { token: string };
    AtmoAirQualityProvider.token = {
      value: token,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    };
    return token;
  }

  private mapAtmoData(p: AtmoProperties): AirQualityData {
    const aqiMapping: Record<number, number> = {
      0: 50,
      1: 25,
      2: 75,
      3: 125,
      4: 175,
      5: 250,
      6: 350,
      7: 300,
    };
    const levelMapping: Record<number, AirQualityData["level"]> = {
      1: "bon",
      2: "moyen",
      3: "dégradé",
      4: "mauvais",
      5: "très_mauvais",
      6: "très_mauvais",
      7: "très_mauvais",
    };

    const aqi = aqiMapping[p.code_qual] ?? 75;
    const level = levelMapping[p.code_qual] ?? "moyen";

    return {
      aqi,
      level,
      pollutants: this.extractSubIndices(p),
      source: p.source ?? "Atmo France",
      lastUpdated: new Date(p.date_maj ?? p.date_ech ?? Date.now()),
      history: [],
    };
  }

  private extractSubIndices(p: AtmoProperties): AirQualityData["pollutants"] {
    const pollutants: AirQualityData["pollutants"] = {};
    if (p.code_no2 !== undefined) pollutants.no2 = p.code_no2;
    if (p.code_o3 !== undefined) pollutants.o3 = p.code_o3;
    if (p.code_pm10 !== undefined) pollutants.pm10 = p.code_pm10;
    if (p.code_pm25 !== undefined) pollutants.pm25 = p.code_pm25;
    if (p.code_so2 !== undefined) pollutants.so2 = p.code_so2;
    return pollutants;
  }

  private getFallbackData(source: string): AirQualityData {
    return {
      aqi: 50,
      level: "moyen",
      pollutants: {},
      source,
      lastUpdated: new Date(),
      history: [],
    };
  }
}
