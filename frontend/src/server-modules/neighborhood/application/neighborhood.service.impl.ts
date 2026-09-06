import type { NeighborhoodService } from "./neighborhood.service";
import type { NeighborhoodAnalysis, PoiCategory } from "../domain/neighborhood.types";
import type { NeighborhoodProvider } from "../infrastructure/neighborhood.provider";

/** Le rayon du « voisinage » proprement dit : ce qu'on atteint à pied. */
const RING_RADIUS_METERS = 800;

export class NeighborhoodServiceImpl implements NeighborhoodService {
  constructor(private readonly provider: NeighborhoodProvider) {}

  async getNeighborhoodData(lat: number, lon: number): Promise<NeighborhoodAnalysis> {
    const pois = await this.provider.findNearbyPois(lat, lon, RING_RADIUS_METERS);

    const essentialCategories: PoiCategory[] = [
      "school",
      "supermarket",
      "bakery",
      "pharmacy",
      "doctor",
      "park",
    ];

    // Le niveau qualifie le voisinage, donc il se calcule sur le voisinage seul. Le
    // provider ajoute des équipements structurants cherchés bien au-delà du rayon
    // (hôpital, lycée) : les compter ici ferait passer un hameau pour « bien équipé »
    // parce qu'un collège se trouve à 12 km.
    const inRing = pois.filter((p) => p.distanceMeters <= RING_RADIUS_METERS);

    const foundCategories = new Set(inRing.map((p) => p.category));
    const essentialFound = essentialCategories.filter((c) => foundCategories.has(c)).length;
    const veryClose = inRing.filter((p) => p.distanceMeters <= 200).length;

    let label = "peu équipé";
    if (essentialFound === essentialCategories.length && veryClose >= 6) {
      label = "excellent";
    } else if (essentialFound >= 4 && (inRing.length >= 10 || veryClose >= 3)) {
      label = "bien équipé";
    } else if (essentialFound >= 2 || inRing.length >= 5) {
      label = "équipement moyen";
    }

    return {
      pois: pois.slice(0, 50),
      label,
    };
  }
}
