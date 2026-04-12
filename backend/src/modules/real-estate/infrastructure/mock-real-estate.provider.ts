import type { RealEstateProvider } from "./real-estate.provider.js";

export class MockRealEstateProvider implements RealEstateProvider {
  async getNearbyTransactions() {
    return {
      nearbyTransactionsCount: 14,
      priceLevel: "élevé" as const,
      confidence: "moyenne" as const,
      medianPricePerSquareMeter: 6150,
      transactionFeatures: [],
    };
  }
}
