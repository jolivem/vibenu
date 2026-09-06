import { isCacheDisabled } from "@/server-shared/infrastructure/cache/in-memory-cache";
import { query } from "@/server-shared/infrastructure/database/postgres";
import type { CardInsights } from "@/server-shared/types/card-insights";
import type { AnalysisMode } from "@/server-shared/types/location-analysis.dto";
import { CARD_INSIGHTS_PROMPT_VERSION } from "./card-insights.prompt";

/**
 * 90 jours : les sources commentées sont annuelles (recensement INSEE, SSMSI, normales
 * 1991-2020, présidentielle 2022). Les 30 jours de l'ancien narrative_cache faisaient
 * régénérer des phrases identiques.
 */
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

interface CacheRow {
  content: CardInsights | string;
  generated_at: Date | string;
}

export interface CachedCardInsights {
  insights: CardInsights;
  generatedAt: string;
}

/**
 * Cache Postgres des mini-synthèses.
 *
 * Toutes les erreurs SQL sont avalées : une base indisponible doit coûter une
 * régénération, jamais la page. C'est la convention des autres caches du module.
 */
export class CardInsightsCacheProvider {
  async get(geoKey: string, mode: AnalysisMode, model: string): Promise<CachedCardInsights | null> {
    if (isCacheDisabled()) return null;

    try {
      const rows = await query<CacheRow>(
        `SELECT content, generated_at
           FROM card_insights_cache
          WHERE geo_key = $1 AND mode = $2 AND model = $3 AND version = $4
          LIMIT 1`,
        [geoKey, mode, model, CARD_INSIGHTS_PROMPT_VERSION],
      );
      if (rows.length === 0) return null;

      const row = rows[0];
      const generatedAt =
        typeof row.generated_at === "string" ? row.generated_at : row.generated_at.toISOString();

      if (Date.now() - new Date(generatedAt).getTime() > TTL_MS) return null;

      const insights =
        typeof row.content === "string" ? (JSON.parse(row.content) as CardInsights) : row.content;

      return { insights, generatedAt };
    } catch (err) {
      console.warn("[card-insights] cache read failed:", err);
      return null;
    }
  }

  async set(
    geoKey: string,
    mode: AnalysisMode,
    model: string,
    insights: CardInsights,
  ): Promise<void> {
    if (isCacheDisabled()) return;

    try {
      await query(
        `INSERT INTO card_insights_cache (geo_key, mode, model, version, content, generated_at)
              VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
         ON CONFLICT (geo_key, mode, model, version)
         DO UPDATE SET content = EXCLUDED.content, generated_at = EXCLUDED.generated_at`,
        [geoKey, mode, model, CARD_INSIGHTS_PROMPT_VERSION, JSON.stringify(insights)],
      );
    } catch (err) {
      console.warn("[card-insights] cache write failed:", err);
    }
  }
}
