import type { NeighborhoodAnalysis } from "../domain/neighborhood.types.js";

export interface NeighborhoodService {
  getNeighborhoodData(lat: number, lon: number): Promise<NeighborhoodAnalysis>;
}
