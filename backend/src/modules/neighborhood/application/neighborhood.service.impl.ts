import type { NeighborhoodService } from "./neighborhood.service.js";
import type { NeighborhoodAnalysis, PoiCategory } from "../domain/neighborhood.types.js";
import type { NeighborhoodProvider } from "../infrastructure/neighborhood.provider.js";

export class NeighborhoodServiceImpl implements NeighborhoodService {
  constructor(private readonly provider: NeighborhoodProvider) {}

  async getNeighborhoodData(lat: number, lon: number): Promise<NeighborhoodAnalysis> {
    const pois = await this.provider.findNearbyPois(lat, lon, 800);

    // Score based on diversity and proximity of essential services
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

    // Base score: diversity of essential services (0-60 pts)
    let score = Math.round((essentialFound / essentialCategories.length) * 60);

    // Bonus: total POI count (0-25 pts)
    score += Math.min(25, Math.round(pois.length * 1.5));

    // Bonus: something very close (<200m) (0-15 pts)
    const veryClose = pois.filter((p) => p.distanceMeters <= 200).length;
    score += Math.min(15, veryClose * 3);

    score = Math.min(100, score);

    let label = "peu équipé";
    if (score >= 70) label = "bien équipé";
    else if (score >= 40) label = "équipement moyen";

    return {
      pois: pois.slice(0, 15), // Top 15 closest
      score,
      label,
    };
  }
}
