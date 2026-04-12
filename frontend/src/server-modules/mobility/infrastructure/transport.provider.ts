import type { MobilityAnalysis } from "../domain/mobility.types";

export interface TransportProvider {
  findNearbyStops(
    lat: number,
    lon: number,
    radiusMeters: number,
  ): Promise<Pick<MobilityAnalysis, "nearestStops" | "nearestStation">>;
}
