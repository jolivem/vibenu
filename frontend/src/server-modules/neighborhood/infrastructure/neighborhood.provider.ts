import type { NeighborhoodPoi } from "../domain/neighborhood.types";

export interface NeighborhoodProvider {
  findNearbyPois(lat: number, lon: number, radiusMeters: number): Promise<NeighborhoodPoi[]>;
}
