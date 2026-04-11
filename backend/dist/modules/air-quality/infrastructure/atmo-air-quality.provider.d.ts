import type { AirQualityData } from "../domain/air-quality.types.js";
import type { AirQualityProvider } from "../application/air-quality.service.js";
/**
 * Air quality provider using Atmo France API
 * Requires an API token (set ATMO_API_TOKEN env var)
 * Falls back to a neutral score when token is missing or API fails
 *
 * The provider accepts a code_insee to query the commune-level air quality index.
 * API endpoint pattern: /api/v1/communes/{code_insee}/indices/atmo
 */
export declare class AtmoAirQualityProvider implements AirQualityProvider {
    private readonly apiToken;
    private readonly baseUrl;
    getAirQuality(lat: number, lon: number, codeInsee?: string): Promise<AirQualityData>;
    private mapAtmoData;
    private extractSubIndices;
    private getFallbackData;
}
