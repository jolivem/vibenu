import { query } from "../../../server-shared/infrastructure/database/postgres";
import type { CommuneNarrativeContent } from "../domain/commune-narrative.types";
import { COMMUNE_PROMPT_VERSION } from "./commune-narrative.prompt";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

interface CacheRow {
  content: CommuneNarrativeContent | string;
  generated_at: Date | string;
}

export interface CachedCommuneNarrative {
  content: CommuneNarrativeContent;
  generatedAt: string;
}

export class CommuneNarrativeCacheProvider {
  async get(codeCommune: string, model: string): Promise<CachedCommuneNarrative | null> {
    const rows = await query<CacheRow>(
      `SELECT content, generated_at
       FROM commune_narrative_cache
       WHERE code_commune = $1 AND model = $2 AND version = $3
       LIMIT 1`,
      [codeCommune, model, COMMUNE_PROMPT_VERSION],
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    const generatedAt = typeof row.generated_at === "string"
      ? row.generated_at
      : row.generated_at.toISOString();

    // Vérification TTL côté code
    if (Date.now() - new Date(generatedAt).getTime() > NINETY_DAYS_MS) {
      return null;
    }

    const content = typeof row.content === "string"
      ? (JSON.parse(row.content) as CommuneNarrativeContent)
      : row.content;

    return { content, generatedAt };
  }

  async set(
    codeCommune: string,
    model: string,
    content: CommuneNarrativeContent,
  ): Promise<void> {
    await query(
      `INSERT INTO commune_narrative_cache (code_commune, model, version, content, generated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (code_commune, model, version)
       DO UPDATE SET content = EXCLUDED.content, generated_at = EXCLUDED.generated_at`,
      [codeCommune, model, COMMUNE_PROMPT_VERSION, JSON.stringify(content)],
    );
  }
}
