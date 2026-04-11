import type { RealEstateAnalysis } from "../domain/real-estate.types.js";

export interface RealEstateService {
  getMarketData(lat: number, lon: number, codeInsee?: string): Promise<RealEstateAnalysis>;
}
