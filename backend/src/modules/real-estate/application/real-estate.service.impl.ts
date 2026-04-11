import type { RealEstateService } from "./real-estate.service.js";
import type { RealEstateAnalysis } from "../domain/real-estate.types.js";
import type { RealEstateProvider } from "../infrastructure/real-estate.provider.js";

export class RealEstateServiceImpl implements RealEstateService {
  constructor(private readonly realEstateProvider: RealEstateProvider) {}

  async getMarketData(lat: number, lon: number, codeInsee?: string): Promise<RealEstateAnalysis> {
    const data = await this.realEstateProvider.getNearbyTransactions(lat, lon, 1000, codeInsee);

    let score = 50;
    if ((data.nearbyTransactionsCount ?? 0) >= 10) score += 15;
    if (data.confidence === "élevée") score += 10;
    if (data.priceLevel === "moyen") score += 10;
    if (data.priceLevel === "élevé") score += 5;

    return {
      ...data,
      score: Math.min(score, 100),
    };
  }
}
