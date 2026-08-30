import type { DemographicsAnalysis } from "../domain/demographics.types";

export interface DemographicsService {
  getDemographicsData(lat: number, lon: number): Promise<DemographicsAnalysis | null>;
}
