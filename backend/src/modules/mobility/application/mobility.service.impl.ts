import type { MobilityService } from "./mobility.service.js";
import type { MobilityAnalysis } from "../domain/mobility.types.js";
import type { TransportProvider } from "../infrastructure/transport.provider.js";

export class MobilityServiceImpl implements MobilityService {
  constructor(private readonly transportProvider: TransportProvider) {}

  async getMobilityData(lat: number, lon: number): Promise<MobilityAnalysis> {
    const data = await this.transportProvider.findNearbyStops(lat, lon, 1000);

    const base = 20;
    const nearestDistance = data.nearestStops[0]?.distanceMeters ?? 2000;

    let nearestStopPoints = 0;
    if (nearestDistance <= 300) nearestStopPoints = 35;
    else if (nearestDistance <= 600) nearestStopPoints = 20;

    let stationPoints = 0;
    if (data.nearestStation && data.nearestStation.distanceMeters <= 1500) stationPoints = 20;

    let densityPoints = 0;
    if (data.nearestStops.length >= 3) densityPoints = 15;

    const score = Math.min(base + nearestStopPoints + stationPoints + densityPoints, 100);

    let label: MobilityAnalysis["label"] = "faible";
    if (score >= 85) label = "très bon";
    else if (score >= 70) label = "bon";
    else if (score >= 45) label = "correct";

    const scoreBreakdown = {
      base,
      nearestStop: data.nearestStops[0]
        ? `${data.nearestStops[0].name} (${nearestDistance}m, ${data.nearestStops[0].mode})`
        : "aucun arrêt",
      nearestStopPoints,
      station: data.nearestStation
        ? `${data.nearestStation.name} (${data.nearestStation.distanceMeters}m)`
        : "aucune gare",
      stationPoints,
      density: `${data.nearestStops.length} arrêt(s)`,
      densityPoints,
    };

    return {
      nearestStops: data.nearestStops,
      nearestStation: data.nearestStation,
      score,
      label,
      scoreBreakdown,
    };
  }
}
