import type { MobilityAnalysis, MobilityCounts } from "../domain/mobility.types";

/**
 * Arrêts et gares les plus proches, et, pour les providers qui savent les produire, les
 * comptages dans `countRadiusMeters` — facultatifs, les providers non branchés n'en ont pas.
 */
export type TransportStopsResult = Pick<MobilityAnalysis, "nearestStops" | "nearestStations"> & {
  counts?: MobilityCounts;
};

export interface TransportProvider {
  findNearbyStops(
    lat: number,
    lon: number,
    radiusMeters: number,
    countRadiusMeters?: number,
  ): Promise<TransportStopsResult>;
}
