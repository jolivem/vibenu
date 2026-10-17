import type { AirQualityAnalysis, AnnualPollutantStat } from "../domain/air-quality.types";

export interface AirQualityService {
  getAirQualityData(lat: number, lon: number): Promise<AirQualityAnalysis>;
}

export class AirQualityServiceImpl implements AirQualityService {
  constructor(private readonly annualProvider: AnnualAirQualityProvider) {}

  async getAirQualityData(lat: number, lon: number): Promise<AirQualityAnalysis> {
    const annual = await this.annualProvider.getAnnualStats(lat, lon).catch((error) => {
      console.error("Air quality service error:", error);
      return [] as AnnualPollutantStat[];
    });
    return { available: annual.length > 0, annual };
  }
}

export interface AnnualAirQualityProvider {
  /** Ne lève jamais : renvoie `[]` si la source est indisponible. */
  getAnnualStats(lat: number, lon: number): Promise<AnnualPollutantStat[]>;
}
