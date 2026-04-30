import type { MobilityService } from "./mobility.service";
import type { MobilityAnalysis } from "../domain/mobility.types";
import type { TransportProvider } from "../infrastructure/transport.provider";

export class MobilityServiceImpl implements MobilityService {
  constructor(private readonly transportProvider: TransportProvider) {}

  async getMobilityData(lat: number, lon: number): Promise<MobilityAnalysis> {
    const close = await this.transportProvider.findNearbyStops(lat, lon, 1000);

    // Si aucune gare/métro/RER dans un rayon de 1 km, élargit la recherche
    // pour trouver la plus proche (rayon 50 km, couvre la quasi-totalité de la France).
    let nearestStation = close.nearestStation;
    if (!nearestStation) {
      const wide = await this.transportProvider.findNearbyStops(lat, lon, 50_000);
      nearestStation = wide.nearestStation;
    }

    const label = deriveLabel({ nearestStops: close.nearestStops, nearestStation });

    return {
      nearestStops: close.nearestStops,
      nearestStation,
      label,
    };
  }
}

function deriveLabel(data: {
  nearestStops: Array<{ distanceMeters: number }>;
  nearestStation?: { distanceMeters: number };
}): MobilityAnalysis["label"] {
  const nearestDistance = data.nearestStops[0]?.distanceMeters ?? 2000;
  const hasStop300 = nearestDistance <= 300;
  const hasStop600 = nearestDistance <= 600;
  const hasStation = data.nearestStation && data.nearestStation.distanceMeters <= 1500;
  const dense = data.nearestStops.length >= 3;

  if (hasStop300 && hasStation && dense) return "très bon";
  if ((hasStop300 || hasStop600) && hasStation) return "bon";
  if (hasStop600 || hasStation) return "correct";
  return "faible";
}
