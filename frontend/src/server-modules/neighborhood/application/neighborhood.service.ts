import type { NeighborhoodAnalysis } from "../domain/neighborhood.types";

export interface NeighborhoodService {
  getNeighborhoodData(lat: number, lon: number): Promise<NeighborhoodAnalysis>;
}
