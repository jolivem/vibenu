import type { RealEstateProvider } from "./real-estate.provider";

/**
 * No-op provider: DVF data is now fetched client-side to avoid
 * Cerema API blocking requests from cloud/datacenter IPs (Vercel).
 */
export class NoOpRealEstateProvider implements RealEstateProvider {
  async getNearbyTransactions() {
    return {
      nearbyTransactionsCount: 0,
      priceLevel: "moyen" as const,
      confidence: "faible" as const,
      medianPricePerSquareMeter: 0,
      transactionFeatures: [],
    };
  }
}
