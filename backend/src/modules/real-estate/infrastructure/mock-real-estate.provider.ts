import type { RealEstateProvider } from "./real-estate.provider.js";

export class MockRealEstateProvider implements RealEstateProvider {
  async getNearbyTransactions(): Promise<{
    nearbyTransactionsCount: number;
    priceLevel: "faible" | "moyen" | "élevé";
    confidence: "faible" | "moyenne" | "élevée";
    medianPricePerSquareMeter: number;
  }> {
    return {
      nearbyTransactionsCount: 14,
      priceLevel: "élevé",
      confidence: "moyenne",
      medianPricePerSquareMeter: 6150,
    };
  }
}
