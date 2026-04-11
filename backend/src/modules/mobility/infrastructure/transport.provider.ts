import type { MobilityAnalysis } from "../domain/mobility.types.js";

export interface TransportProvider {
  findNearbyStops(
    lat: number,
    lon: number,
    radiusMeters: number,
  ): Promise<Pick<MobilityAnalysis, "nearestStops" | "nearestStation">>;
}
