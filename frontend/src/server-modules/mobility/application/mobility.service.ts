import type { MobilityAnalysis } from "../domain/mobility.types";

export interface MobilityService {
  getMobilityData(lat: number, lon: number): Promise<MobilityAnalysis>;
}
