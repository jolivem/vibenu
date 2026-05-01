import { query } from "../../../server-shared/infrastructure/database/neon";
import { InMemoryCache } from "../../../server-shared/infrastructure/cache/in-memory-cache";
import type { CandidateResult, ElectionsAnalysis } from "../domain/elections.types";
import type { ElectionsProvider } from "./elections.provider";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

interface CommuneRow {
  inscrits: number;
  votants: number;
  exprimes: number;
}

interface ResultRow {
  candidat: string;
  parti: string;
  panneau: number;
  pct_exprimes: string | number;
}

export class ElectionsDatabaseProvider implements ElectionsProvider {
  private static cache = new InMemoryCache<ElectionsAnalysis | null>(SEVEN_DAYS);

  async getResults(codeInsee: string): Promise<ElectionsAnalysis | null> {
    const cached = ElectionsDatabaseProvider.cache.get(codeInsee);
    if (cached !== undefined) return cached;

    try {
      const [communeRows, nationalRows, communeRes, nationalRes] = await Promise.all([
        query<CommuneRow>(
          `SELECT inscrits, votants, exprimes FROM elections_pres_2022_t1_commune WHERE code_commune = $1`,
          [codeInsee],
        ),
        query<CommuneRow>(
          `SELECT inscrits, votants, exprimes FROM elections_pres_2022_t1_commune WHERE code_commune = 'FRANCE'`,
        ),
        query<ResultRow>(
          `SELECT candidat, parti, panneau, pct_exprimes
             FROM elections_pres_2022_t1_results
            WHERE code_commune = $1
            ORDER BY panneau`,
          [codeInsee],
        ),
        query<ResultRow>(
          `SELECT candidat, parti, panneau, pct_exprimes
             FROM elections_pres_2022_t1_results
            WHERE code_commune = 'FRANCE'
            ORDER BY panneau`,
        ),
      ]);

      const commune = communeRows[0];
      const national = nationalRows[0];
      if (!commune || !national || communeRes.length === 0 || nationalRes.length === 0) {
        ElectionsDatabaseProvider.cache.set(codeInsee, null);
        return null;
      }

      const nationalByPanneau = new Map(
        nationalRes.map((r) => [r.panneau, Number(r.pct_exprimes)]),
      );

      const candidates: CandidateResult[] = communeRes.map((r) => ({
        candidat: r.candidat,
        parti: r.parti,
        panneau: r.panneau,
        pctCommune: Number(r.pct_exprimes),
        pctNational: nationalByPanneau.get(r.panneau) ?? 0,
      }));

      const result: ElectionsAnalysis = {
        scrutin: "presidentielle-2022-t1",
        inscrits: commune.inscrits,
        votants: commune.votants,
        exprimes: commune.exprimes,
        participationPct: commune.inscrits
          ? Math.round((commune.votants / commune.inscrits) * 1000) / 10
          : 0,
        nationalParticipationPct: national.inscrits
          ? Math.round((national.votants / national.inscrits) * 1000) / 10
          : 0,
        candidates,
      };

      ElectionsDatabaseProvider.cache.set(codeInsee, result);
      return result;
    } catch (error) {
      console.warn("Elections database provider error:", error);
      return null;
    }
  }
}
