import type { AirQualityData } from "../domain/air-quality.types";
import type { AirQualityProvider } from "../application/air-quality.service";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";

const SIX_HOURS = 6 * 60 * 60 * 1000;

interface AtmoIndice {
  date: string;
  code_qual: number;  // 1=Bon, 2=Moyen, 3=Dégradé, 4=Mauvais, 5=Très mauvais
  lib_qual: string;   // "Bon", "Moyen", etc.
  source: string;
  code_no2?: number;
  code_o3?: number;
  code_pm10?: number;
  code_pm25?: number;
  code_so2?: number;
}

interface AtmoResponse {
  data?: AtmoIndice[];
  error?: string;
}

/**
 * Air quality provider using Atmo France API
 * Requires an API token (set ATMO_API_TOKEN env var)
 * Falls back to a neutral score when token is missing or API fails
 *
 * The provider accepts a code_insee to query the commune-level air quality index.
 * API endpoint pattern: /api/v1/communes/{code_insee}/indices/atmo
 */
export class AtmoAirQualityProvider implements AirQualityProvider {
  private static cache = new InMemoryCache<AirQualityData>(SIX_HOURS);
  private readonly apiToken = process.env.ATMO_API_TOKEN ?? "";
  private readonly baseUrl = "https://api.atmo-france.org/api/v1";

  async getAirQuality(lat: number, lon: number, codeInsee?: string): Promise<AirQualityData> {
    const cacheKey = buildGeoKey(lat, lon);
    const cached = AtmoAirQualityProvider.cache.get(cacheKey);
    if (cached) return cached;
    // Without API token or code_insee, return neutral fallback
    if (!this.apiToken || !codeInsee) {
      return this.getFallbackData(
        !this.apiToken
          ? "Token Atmo non configuré"
          : "Code INSEE non disponible",
      );
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(
        `${this.baseUrl}/communes/${codeInsee}/indices/atmo?date_diffusion=${today}&api_token=${this.apiToken}`,
        { headers: { Accept: "application/json" } },
      );

      if (!response.ok) {
        console.warn(`Atmo API error: ${response.status}`);
        return this.getFallbackData("API Atmo indisponible");
      }

      const data = (await response.json()) as AtmoResponse;

      if (!data.data || data.data.length === 0) {
        return this.getFallbackData("Aucun indice disponible");
      }

      const result = this.mapAtmoData(data.data[0]);
      AtmoAirQualityProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.warn("Atmo provider error:", error);
      return this.getFallbackData("Erreur API Atmo");
    }
  }

  private mapAtmoData(indice: AtmoIndice): AirQualityData {
    // code_qual: 1=Bon → AQI~25, 2=Moyen → AQI~75, 3=Dégradé → AQI~125, 4=Mauvais → AQI~175, 5=Très mauvais → AQI~250
    const aqiMapping: Record<number, number> = {
      1: 25,
      2: 75,
      3: 125,
      4: 175,
      5: 250,
    };

    const levelMapping: Record<number, AirQualityData["level"]> = {
      1: "bon",
      2: "moyen",
      3: "dégradé",
      4: "mauvais",
      5: "très_mauvais",
    };

    const aqi = aqiMapping[indice.code_qual] ?? 75;
    const level = levelMapping[indice.code_qual] ?? "moyen";

    return {
      aqi,
      level,
      pollutants: this.extractSubIndices(indice),
      source: indice.source ?? "Atmo France",
      lastUpdated: new Date(indice.date),
    };
  }

  private extractSubIndices(indice: AtmoIndice): AirQualityData["pollutants"] {
    const pollutants: AirQualityData["pollutants"] = {};

    // Sub-indices are 1-5 scale, convert to approximate µg/m³ for display
    if (indice.code_no2 !== undefined) pollutants.no2 = indice.code_no2;
    if (indice.code_o3 !== undefined) pollutants.o3 = indice.code_o3;
    if (indice.code_pm10 !== undefined) pollutants.pm10 = indice.code_pm10;
    if (indice.code_pm25 !== undefined) pollutants.pm25 = indice.code_pm25;
    if (indice.code_so2 !== undefined) pollutants.so2 = indice.code_so2;

    return pollutants;
  }

  private getFallbackData(source: string): AirQualityData {
    return {
      aqi: 50,
      level: "moyen",
      pollutants: {},
      source,
      lastUpdated: new Date(),
    };
  }
}
