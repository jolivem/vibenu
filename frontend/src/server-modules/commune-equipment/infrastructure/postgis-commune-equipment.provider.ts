import { query } from "@/server-shared/infrastructure/database/postgres";
import { InMemoryCache } from "@/server-shared/infrastructure/cache/in-memory-cache";
import type { CommuneEquipmentProvider } from "./commune-equipment.provider";

/** La BPE et le recensement sont annuels : un mois de cache ne fait rien perdre. */
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

type CountRow = { typequ: string; nb: number };

function toCounts(rows: CountRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.typequ] = Number(row.nb);
  return counts;
}

/**
 * Comptages BPE et populations INSEE, lus en base.
 *
 * Une commune se compte par `depcom` (index `idx_bpe_depcom`, migration 019) ; la France
 * entière par un comptage national groupé par code, ~120 ms, mis en cache.
 */
export class PostgisCommuneEquipmentProvider implements CommuneEquipmentProvider {
  private static countsCache = new InMemoryCache<Record<string, number>>(THIRTY_DAYS);
  private static populationCache = new InMemoryCache<number | null>(THIRTY_DAYS);

  async countByTypequ(codeCommune: string | null, typequ: readonly string[]): Promise<Record<string, number>> {
    const cacheKey = `${codeCommune ?? "FRANCE"}:${[...typequ].sort().join(",")}`;
    const cached = PostgisCommuneEquipmentProvider.countsCache.get(cacheKey);
    if (cached) return cached;

    const rows =
      codeCommune === null
        ? await query<CountRow>(
            `SELECT typequ, COUNT(*)::int AS nb
               FROM bpe_equipment
              WHERE typequ = ANY($1)
              GROUP BY typequ`,
            [typequ],
          )
        : await query<CountRow>(
            `SELECT typequ, COUNT(*)::int AS nb
               FROM bpe_equipment
              WHERE depcom = $1 AND typequ = ANY($2)
              GROUP BY typequ`,
            [codeCommune, typequ],
          );

    const counts = toCounts(rows);
    PostgisCommuneEquipmentProvider.countsCache.set(cacheKey, counts);
    return counts;
  }

  async countByTypequLike(pattern: string, typequ: readonly string[]): Promise<Record<string, number>> {
    const cacheKey = `like:${pattern}:${[...typequ].sort().join(",")}`;
    const cached = PostgisCommuneEquipmentProvider.countsCache.get(cacheKey);
    if (cached) return cached;

    const rows = await query<CountRow>(
      `SELECT typequ, COUNT(*)::int AS nb
         FROM bpe_equipment
        WHERE depcom LIKE $1 AND typequ = ANY($2)
        GROUP BY typequ`,
      [pattern, typequ],
    );

    const counts = toCounts(rows);
    PostgisCommuneEquipmentProvider.countsCache.set(cacheKey, counts);
    return counts;
  }

  async getPopulation(scopeCode: string): Promise<number | null> {
    const cached = PostgisCommuneEquipmentProvider.populationCache.get(scopeCode);
    if (cached !== undefined) return cached;

    const rows = await query<{ population: number | null }>(
      `SELECT population FROM insee_aggregate WHERE scope_code = $1`,
      [scopeCode],
    );
    const population = rows[0]?.population != null ? Number(rows[0].population) : null;
    PostgisCommuneEquipmentProvider.populationCache.set(scopeCode, population);
    return population;
  }
}
