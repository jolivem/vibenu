import type { DemographicsService } from "./demographics.service";
import type { DemographicsAnalysis } from "../domain/demographics.types";
import type { DemographicsProvider } from "../infrastructure/demographics.provider";

export class DemographicsServiceImpl implements DemographicsService {
  constructor(private readonly provider: DemographicsProvider) {}

  async getDemographicsData(lat: number, lon: number): Promise<DemographicsAnalysis | null> {
    return this.provider.getDemographics(lat, lon);
  }
}
