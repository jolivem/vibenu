import type { RealEstateService } from "./real-estate.service";
import type { RealEstateAnalysis } from "../domain/real-estate.types";
import type { RealEstateProvider } from "../infrastructure/real-estate.provider";
import type { AnalysisMode } from "../../../server-shared/types/location-analysis.dto";

export class RealEstateServiceImpl implements RealEstateService {
  constructor(private readonly realEstateProvider: RealEstateProvider) {}

  async getMarketData(
    lat: number,
    lon: number,
    codeInsee?: string,
    options?: { mode?: AnalysisMode },
  ): Promise<RealEstateAnalysis> {
    if (options?.mode === "commune" && codeInsee) {
      return this.realEstateProvider.getCommuneTransactions(codeInsee);
    }
    return this.realEstateProvider.getNearbyTransactions(lat, lon, 1000, codeInsee);
  }
}
