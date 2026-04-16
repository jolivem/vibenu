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
 * Combined neighborhood provider using both OSM and BPE data from PostgreSQL.
 * - OSM provides: names, restaurants, parks, and general POIs
 * - BPE provides: official data (doctors, pharmacies, schools with INSEE counts)
 * Results are merged and deduplicated by category + proximity.
 */
export class CombinedNeighborhoodProvider implements NeighborhoodProvider {
  private static cache = new InMemoryCache<NeighborhoodPoi[]>(SEVEN_DAYS);

  async findNearbyPois(lat: number, lon: number, radiusMeters: number): Promise<NeighborhoodPoi[]> {
    const cacheKey = `${buildGeoKey(lat, lon)}:${radiusMeters}`;
    const cached = CombinedNeighborhoodProvider.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Query both tables with UNION ALL, ordered by distance
      const rows = await query<{ name: string | null; category: string; distance_meters: number; source: string }>(
        `(
          SELECT name, category,
                 ST_Distance(geom::geography, ST_MakePoint($1, $2)::geography) AS distance_meters,
                 'osm' AS source
          FROM osm_pois
          WHERE ST_DWithin(geom::geography, ST_MakePoint($1, $2)::geography, $3)
        )
        UNION ALL
        (
          SELECT name, category,
                 ST_Distance(geom::geography, ST_MakePoint($1, $2)::geography) AS distance_meters,
                 'bpe' AS source
          FROM bpe_equipment
          WHERE ST_DWithin(geom::geography, ST_MakePoint($1, $2)::geography, $3)
        )
        ORDER BY distance_meters ASC
        LIMIT 100`,
        [lon, lat, radiusMeters],
      );

      const pois: NeighborhoodPoi[] = [];
      const countByCategory: Record<string, number> = {};
      const seen: Set<string> = new Set();

      for (const row of rows) {
        if (!VALID_CATEGORIES.has(row.category)) continue;

        // Max 3 per category
        const count = countByCategory[row.category] ?? 0;
        if (count >= 3) continue;

        const name = row.name || DEFAULT_NAMES[row.category] || row.category;
        const dist = Math.round(Number(row.distance_meters));

        // Deduplicate: skip if same name+category already within 50m
        const dedupeKey = `${row.category}:${name.toLowerCase()}`;
        if (seen.has(dedupeKey)) continue;

        // Also skip generic names if we already have a named one nearby
        const genericKey = `${row.category}:${dist < 50 ? "near" : Math.floor(dist / 100)}`;
        if (!row.name && seen.has(genericKey)) continue;

        seen.add(dedupeKey);
        if (row.name) seen.add(genericKey);

        countByCategory[row.category] = count + 1;

        pois.push({
          name,
          category: row.category as PoiCategory,
          distanceMeters: dist,
        });
      }

      CombinedNeighborhoodProvider.cache.set(cacheKey, pois);
      return pois;
    } catch (error) {
      console.error("Combined neighborhood provider error:", error);
      return [];
    }
  }
}
