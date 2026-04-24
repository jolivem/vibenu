import { query } from "@/server-shared/infrastructure/database/neon";
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

  async get(lat: number, lon: number): Promise<CachedNarrative | null> {
    const geoKey = buildGeoKey(lat, lon);
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

  async set(lat: number, lon: number, paragraph: string): Promise<void> {
    const geoKey = buildGeoKey(lat, lon);
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
