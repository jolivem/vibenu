import type { MobilityService } from "./mobility.service.js";
import type { MobilityAnalysis } from "../domain/mobility.types.js";
import type { TransportProvider } from "../infrastructure/transport.provider.js";

export class MobilityServiceImpl implements MobilityService {
  constructor(private readonly transportProvider: TransportProvider) {}

  async getMobilityData(lat: number, lon: number): Promise<MobilityAnalysis> {
    const data = await this.transportProvider.findNearbyStops(lat, lon, 1000);

    let score = 20;
    const nearestDistance = data.nearestStops[0]?.distanceMeters ?? 2000;

    if (nearestDistance <= 300) score += 35;
    else if (nearestDistance <= 600) score += 20;

    if (data.nearestStation && data.nearestStation.distanceMeters <= 1500) score += 20;
    if (data.nearestStops.length >= 3) score += 15;

    score = Math.min(score, 100);

    let label: MobilityAnalysis["label"] = "faible";
    if (score >= 70) label = "bon";
    else if (score >= 45) label = "correct";

    return {
      nearestStops: data.nearestStops,
      nearestStation: data.nearestStation,
      score,
      label,
    };
  }
}
