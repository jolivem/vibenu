import type { RealEstateAnalysis } from "../domain/real-estate.types";
import type { AnalysisMode } from "../../../server-shared/types/location-analysis.dto";

export interface RealEstateService {
  getMarketData(
    lat: number,
    lon: number,
    codeInsee?: string,
    options?: { mode?: AnalysisMode },
  ): Promise<RealEstateAnalysis>;
}
