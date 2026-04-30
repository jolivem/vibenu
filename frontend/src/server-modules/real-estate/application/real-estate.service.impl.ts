import type { RealEstateService } from "./real-estate.service";
import type { RealEstateAnalysis } from "../domain/real-estate.types";
import type { RealEstateProvider } from "../infrastructure/real-estate.provider";

export class RealEstateServiceImpl implements RealEstateService {
  constructor(private readonly realEstateProvider: RealEstateProvider) {}

  async getMarketData(lat: number, lon: number, codeInsee?: string): Promise<RealEstateAnalysis> {
    return this.realEstateProvider.getNearbyTransactions(lat, lon, 1000, codeInsee);
  }
}
