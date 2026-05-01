import type { ClimateAnalysis } from "../domain/climate.types";

export interface ClimateService {
  getClimateData(lat: number, lon: number): Promise<ClimateAnalysis | null>;
}
