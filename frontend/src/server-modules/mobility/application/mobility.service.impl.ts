import type { MobilityService } from "./mobility.service";
import type { MobilityAnalysis } from "../domain/mobility.types";
import type { TransportProvider } from "../infrastructure/transport.provider";

export class MobilityServiceImpl implements MobilityService {
  constructor(private readonly transportProvider: TransportProvider) {}

  async getMobilityData(lat: number, lon: number): Promise<MobilityAnalysis> {
    // Deux recherches en parallèle :
    // - 1 km : on garde uniquement les arrêts (bus, tram) — pertinents pour la marche
    // - 20 km : on garde la gare/métro/RER la plus proche.
    //   Au-delà de ~25 km, l'API gtfs-stops de transport.data.gouv.fr cap silencieusement
    //   les bboxes trop larges (renvoie 0 features). 20 km laisse de la marge tout en
    //   couvrant la quasi-totalité des cas en France habitée.
    const [close, wide] = await Promise.all([
      this.transportProvider.findNearbyStops(lat, lon, 1000),
      this.transportProvider.findNearbyStops(lat, lon, 20_000),
    ]);

    const nearestStops = close.nearestStops;
    const nearestStation = wide.nearestStation;

    const label = deriveLabel({ nearestStops, nearestStation });

    return {
      nearestStops,
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
