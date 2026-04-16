import type { NeighborhoodProvider } from "./neighborhood.provider";
import type { NeighborhoodPoi, PoiCategory } from "../domain/neighborhood.types";
import { query } from "../../../server-shared/infrastructure/database/neon";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const DEFAULT_NAMES: Record<string, string> = {
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

const VALID_CATEGORIES = new Set<string>([
  "school", "supermarket", "bakery", "pharmacy", "doctor",
  "park", "sport", "restaurant", "post_office", "bank", "library",
]);

/**
 * Neighborhood provider using OpenStreetMap data stored in PostgreSQL.
 * Replaces Overpass API and BPE providers.
 */
export class OsmNeighborhoodProvider implements NeighborhoodProvider {
  private static cache = new InMemoryCache<NeighborhoodPoi[]>(SEVEN_DAYS);

  async findNearbyPois(lat: number, lon: number, radiusMeters: number): Promise<NeighborhoodPoi[]> {
    const cacheKey = `${buildGeoKey(lat, lon)}:${radiusMeters}`;
    const cached = OsmNeighborhoodProvider.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const rows = await query<{ name: string | null; category: string; distance_meters: number }>(
        `SELECT name, category,
                ST_Distance(geom::geography, ST_MakePoint($1, $2)::geography) AS distance_meters
         FROM osm_pois
         WHERE ST_DWithin(geom::geography, ST_MakePoint($1, $2)::geography, $3)
         ORDER BY distance_meters ASC
         LIMIT 50`,
        [lon, lat, radiusMeters],
      );

      const pois: NeighborhoodPoi[] = [];
      const countByCategory: Record<string, number> = {};

      for (const row of rows) {
        if (!VALID_CATEGORIES.has(row.category)) continue;

        const count = countByCategory[row.category] ?? 0;
        if (count >= 3) continue;
        countByCategory[row.category] = count + 1;

        pois.push({
          name: row.name || DEFAULT_NAMES[row.category] || row.category,
          category: row.category as PoiCategory,
          distanceMeters: Math.round(Number(row.distance_meters)),
        });
      }

      OsmNeighborhoodProvider.cache.set(cacheKey, pois);
      return pois;
    } catch (error) {
      console.error("OSM neighborhood provider error:", error);
      return [];
    }
  }
}
