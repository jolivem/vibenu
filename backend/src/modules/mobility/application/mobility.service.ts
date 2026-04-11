import type { MobilityAnalysis } from "../domain/mobility.types.js";

export interface MobilityService {
  getMobilityData(lat: number, lon: number): Promise<MobilityAnalysis>;
}
