import type { RealEstateProvider } from "./real-estate.provider.js";
/**
 * Real estate provider using DVF (Demandes de Valeurs Foncières) via Cerema API
 * Fetches actual property transactions from the French open dataset
 * API: https://apidf-preprod.cerema.fr/dvf_opendata/geomutations/
 */
export declare class DvfRealEstateProvider implements RealEstateProvider {
    private readonly dvfApiUrl;
    getNearbyTransactions(lat: number, lon: number, _radiusMeters: number, codeInsee?: string): Promise<{
        nearbyTransactionsCount: number;
        priceLevel: "faible" | "élevé" | "moyen";
        confidence: "faible" | "moyenne" | "élevée";
        medianPricePerSquareMeter: number;
    }>;
    private analyzeTransactions;
    private getFallbackData;
}
