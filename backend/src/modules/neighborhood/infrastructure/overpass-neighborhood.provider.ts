import type { NeighborhoodPoi, PoiCategory } from "../domain/neighborhood.types.js";
import type { NeighborhoodProvider } from "./neighborhood.provider.js";
import { InMemoryCache, buildGeoKey } from "../../../shared/infrastructure/cache/in-memory-cache.js";

const ONE_DAY = 24 * 60 * 60 * 1000;

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

/**
 * Neighborhood enrichment provider using Overpass API (OpenStreetMap)
 * Fetches schools, shops, parks, pharmacies, etc. around a location
 */
export class OverpassNeighborhoodProvider implements NeighborhoodProvider {
  private static cache = new InMemoryCache<NeighborhoodPoi[]>(ONE_DAY);
  private readonly overpassUrl = "https://overpass-api.de/api/interpreter";

  async findNearbyPois(lat: number, lon: number, radiusMeters: number): Promise<NeighborhoodPoi[]> {
    const cacheKey = `${buildGeoKey(lat, lon)}:${radiusMeters}`;
    const cached = OverpassNeighborhoodProvider.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildQuery(lat, lon, radiusMeters);

      const response = await fetch(this.overpassUrl, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!response.ok) {
        console.warn(`Overpass API error: ${response.status}`);
        return [];
      }

      const data = (await response.json()) as OverpassResponse;
      const result = this.parseElements(data.elements, lat, lon);
      OverpassNeighborhoodProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.warn("Overpass neighborhood provider error:", error);
      return [];
    }
  }

  private buildQuery(lat: number, lon: number, radius: number): string {
    return `
[out:json][timeout:10];
(
  node["amenity"~"school|pharmacy|doctors|bank|post_office|library|restaurant"](around:${radius},${lat},${lon});
  node["shop"~"supermarket|bakery"](around:${radius},${lat},${lon});
  node["leisure"~"park|sports_centre"](around:${radius},${lat},${lon});
  way["amenity"~"school|pharmacy|doctors|bank|post_office|library"](around:${radius},${lat},${lon});
  way["shop"~"supermarket|bakery"](around:${radius},${lat},${lon});
  way["leisure"~"park|sports_centre"](around:${radius},${lat},${lon});
);
out center;
`;
  }

  private parseElements(elements: OverpassElement[], centerLat: number, centerLon: number): NeighborhoodPoi[] {
    const pois: NeighborhoodPoi[] = [];

    for (const el of elements) {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (!elLat || !elLon || !el.tags) continue;

      const category = this.resolveCategory(el.tags);
      if (!category) continue;

      const name = el.tags.name ?? this.defaultName(category);
      const distance = this.calculateDistance(centerLat, centerLon, elLat, elLon);

      pois.push({
        name,
        category,
        distanceMeters: Math.round(distance),
      });
    }

    return pois.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  private resolveCategory(tags: Record<string, string>): PoiCategory | null {
    const amenity = tags.amenity;
    const shop = tags.shop;
    const leisure = tags.leisure;

    if (amenity === "school") return "school";
    if (amenity === "pharmacy") return "pharmacy";
    if (amenity === "doctors") return "doctor";
    if (amenity === "bank") return "bank";
    if (amenity === "post_office") return "post_office";
    if (amenity === "library") return "library";
    if (amenity === "restaurant") return "restaurant";
    if (shop === "supermarket") return "supermarket";
    if (shop === "bakery") return "bakery";
    if (leisure === "park") return "park";
    if (leisure === "sports_centre") return "sport";

    return null;
  }

  private defaultName(category: PoiCategory): string {
    const names: Record<PoiCategory, string> = {
      school: "École",
      supermarket: "Supermarché",
      bakery: "Boulangerie",
      pharmacy: "Pharmacie",
      doctor: "Médecin",
      park: "Parc",
      sport: "Équipement sportif",
      restaurant: "Restaurant",
      post_office: "Bureau de poste",
      bank: "Banque",
      library: "Bibliothèque",
    };
    return names[category];
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6_371_000;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dPhi / 2) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
