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
      medianPricePerSquareMeter: 6150,
      transactionFeatures: [],
    };
  }
}
