import type { NeighborhoodService } from "./neighborhood.service";
import type { NeighborhoodAnalysis, PoiCategory } from "../domain/neighborhood.types";
import type { NeighborhoodProvider } from "../infrastructure/neighborhood.provider";

export class NeighborhoodServiceImpl implements NeighborhoodService {
  constructor(private readonly provider: NeighborhoodProvider) {}

  async getNeighborhoodData(lat: number, lon: number): Promise<NeighborhoodAnalysis> {
    const pois = await this.provider.findNearbyPois(lat, lon, 800);

    const essentialCategories: PoiCategory[] = [
      "school",
      "supermarket",
      "bakery",
      "pharmacy",
      "doctor",
      "park",
    ];

    const foundCategories = new Set(pois.map((p) => p.category));
    const essentialFound = essentialCategories.filter((c) => foundCategories.has(c)).length;
    const veryClose = pois.filter((p) => p.distanceMeters <= 200).length;

    let label = "peu équipé";
    if (essentialFound >= 4 && (pois.length >= 10 || veryClose >= 3)) {
      label = "bien équipé";
    } else if (essentialFound >= 2 || pois.length >= 5) {
      label = "équipement moyen";
    }

    return {
      pois: pois.slice(0, 15),
      label,
    };
  }
}
