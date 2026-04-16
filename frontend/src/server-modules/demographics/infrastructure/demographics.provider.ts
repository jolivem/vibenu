import type { DemographicsAnalysis } from "../domain/demographics.types";

export interface DemographicsProvider {
  getDemographics(lat: number, lon: number): Promise<DemographicsAnalysis | null>;
}
