import type { RealEstateProvider } from "./real-estate.provider";

export class MockRealEstateProvider implements RealEstateProvider {
  async getNearbyTransactions() {
    return this.sample();
  }
  async getCommuneTransactions() {
    return this.sample();
  }
  private sample() {
    return {
      nearbyTransactionsCount: 14,
      markets: { appartement: { count: 14, medianPricePerSqm: 6150 }, maison: null },
      transactionFeatures: [],
    };
  }
}
