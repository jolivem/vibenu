import type { MobilityService } from "./mobility.service";
import type { MobilityAnalysis, Station } from "../domain/mobility.types";
import type { TransportProvider } from "../infrastructure/transport.provider";

export class MobilityServiceImpl implements MobilityService {
  constructor(private readonly transportProvider: TransportProvider) {}

  async getMobilityData(lat: number, lon: number): Promise<MobilityAnalysis> {
    // Deux recherches en parallèle :
    // - 1 km : arrêts (bus, tram) marchables + gares à proximité immédiate (zones denses
    //   type Paris où plusieurs RER/métros sont dans le rayon)
    // - 20 km : trouve la gare la plus proche pour les zones rurales.
    //
    // On fusionne les deux listes de stations : utile car le wide search peut renvoyer
    // 0 résultat dans les zones très denses (cap implicite de l'API à ~20 000 features),
    // auquel cas le close search prend le relais.
    const [close, wide] = await Promise.all([
      this.transportProvider.findNearbyStops(lat, lon, 1000),
      this.transportProvider.findNearbyStops(lat, lon, 20_000),
    ]);

    const nearestStops = close.nearestStops;
    const nearestStations = mergeStations(close.nearestStations, wide.nearestStations);

    const label = deriveLabel({ nearestStops, nearestStations });

    return {
      nearestStops,
      nearestStations,
      label,
    };
  }
}

function mergeStations(closeStations: Station[], wideStations: Station[]): Station[] {
  const seen = new Map<string, Station>();
  for (const s of [...closeStations, ...wideStations]) {
    const key = `${s.name.toLowerCase().trim()}|${s.mode}`;
    const existing = seen.get(key);
    if (!existing || s.distanceMeters < existing.distanceMeters) {
      seen.set(key, s);
    }
  }
  return Array.from(seen.values())
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 8);
}

function deriveLabel(data: {
  nearestStops: Array<{ distanceMeters: number }>;
  nearestStations: Station[];
}): MobilityAnalysis["label"] {
  const nearestDistance = data.nearestStops[0]?.distanceMeters ?? 2000;
  const hasStop300 = nearestDistance <= 300;
  const hasStop600 = nearestDistance <= 600;
  const closestStation = data.nearestStations[0];
  const hasStation = closestStation != null && closestStation.distanceMeters <= 1500;
  const dense = data.nearestStops.length >= 3;

  // Densité bus immédiate (utile pour les centres urbains sans gare/métro à proximité).
  // Note : nearestStops est tronqué à 5 par le provider, donc stops300 plafonne à 5.
  const stops300 = data.nearestStops.filter((s) => s.distanceMeters <= 300).length;
  const stops600 = data.nearestStops.filter((s) => s.distanceMeters <= 600).length;

  // Excellent : gare/métro/RER à très courte distance (<300 m) + au moins 2 arrêts à 300 m.
  const stationVeryClose = closestStation != null && closestStation.distanceMeters <= 300;
  if (stationVeryClose && stops300 >= 2) return "excellent";

  // Très bon : gare proche + densité, OU réseau de bus très dense (≥4 arrêts dans 300 m)
  if ((hasStop300 && hasStation && dense) || stops300 >= 4) return "très bon";

  // Bon : combo arrêt+gare proches, OU densité bus correcte (≥2 arrêts dans 300 m / ≥3 dans 600 m)
  if ((hasStop300 || hasStop600) && hasStation) return "bon";
  if (stops300 >= 2 || stops600 >= 3) return "bon";

  if (hasStop600 || hasStation) return "correct";
  return "faible";
}
