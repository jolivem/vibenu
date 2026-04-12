import type { RealEstateAnalysis } from "../domain/real-estate.types";

export interface RealEstateService {
  getMarketData(lat: number, lon: number, codeInsee?: string): Promise<RealEstateAnalysis>;
}
