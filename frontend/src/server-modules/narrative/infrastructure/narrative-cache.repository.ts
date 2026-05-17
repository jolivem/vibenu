import { query } from "@/server-shared/infrastructure/database/postgres";
import { buildGeoKey } from "@/server-shared/infrastructure/cache/in-memory-cache";

interface NarrativeCacheRow {
  paragraph: string;
  generated_at: Date;
}

export interface CachedNarrative {
  paragraph: string;
  generatedAt: Date;
}

export class NarrativeCacheRepository {
  private readonly ttlMs: number;
  private readonly model: string;

  constructor(options: { ttlDays?: number; model: string }) {
    this.ttlMs = (options.ttlDays ?? 30) * 24 * 60 * 60 * 1000;
    this.model = options.model;
  }

  /**
   * Clé de cache différenciée par mode : address vs commune, même lat/lon
   * peuvent donner des narratives différentes (la commune utilise un centroïde).
   */
  private cacheKey(lat: number, lon: number, mode: "address" | "commune"): string {
    // Bump le préfixe quand le prompt change matériellement → invalide les anciennes entrées.
    // C2/A : retrait des distances et clarification de hasNearbyStation pour le mode commune.
    // C3/A2 : règle de structuration — positifs en tête, points d'attention en une phrase finale.
    const prefix = mode === "commune" ? "C3:" : "A2:";
    return prefix + buildGeoKey(lat, lon);
  }

  async get(
    lat: number,
    lon: number,
    mode: "address" | "commune" = "address",
  ): Promise<CachedNarrative | null> {
    const geoKey = this.cacheKey(lat, lon, mode);
    try {
      const rows = await query<NarrativeCacheRow>(
        `SELECT paragraph, generated_at
         FROM narrative_cache
         WHERE geo_key = $1 AND model = $2`,
        [geoKey, this.model],
      );
      const row = rows[0];
      if (!row) return null;

      const age = Date.now() - new Date(row.generated_at).getTime();
      if (age > this.ttlMs) return null;

      return { paragraph: row.paragraph, generatedAt: new Date(row.generated_at) };
    } catch (error) {
      console.warn("narrative_cache read failed:", error);
      return null;
    }
  }

  async set(
    lat: number,
    lon: number,
    paragraph: string,
    mode: "address" | "commune" = "address",
  ): Promise<void> {
    const geoKey = this.cacheKey(lat, lon, mode);
    try {
      await query(
        `INSERT INTO narrative_cache (geo_key, model, paragraph, generated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (geo_key) DO UPDATE
           SET paragraph = EXCLUDED.paragraph,
               model = EXCLUDED.model,
               generated_at = EXCLUDED.generated_at`,
        [geoKey, this.model, paragraph],
      );
    } catch (error) {
      console.warn("narrative_cache write failed:", error);
    }
  }
}
