import type { RealEstateProvider } from "./real-estate.provider.js";
export declare class MockRealEstateProvider implements RealEstateProvider {
    getNearbyTransactions(): Promise<{
        nearbyTransactionsCount: number;
        priceLevel: "faible" | "moyen" | "élevé";
        confidence: "faible" | "moyenne" | "élevée";
        medianPricePerSquareMeter: number;
    }>;
}
