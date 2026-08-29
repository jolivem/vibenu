import { query } from "../../../server-shared/infrastructure/database/postgres";
import { InMemoryCache } from "../../../server-shared/infrastructure/cache/in-memory-cache";
import {
  MASKED_MAX_FACTS,
  MASKED_MIN_FACTS,
  SECURITY_INDICATORS,
  type SecurityAnalysis,
  type SecurityIndicator,
} from "../domain/security.types";
import type { SecurityProvider } from "./security.provider";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

interface CommuneRow {
  annee: number;
  indicateur: string;
  taux_pour_mille: string | null;
  denominateur: number;
  base: string;
}

interface ReferenceRow {
  code: string;
  annee: number;
  indicateur: string;
  taux_pour_mille: string;
}

/**
 * Code département à partir du code commune : les DOM tiennent sur 3 caractères
 * (971-976), la métropole sur 2 — la Corse comprise, dont les codes 2A/2B sont déjà
 * les deux premiers caractères de 2A004, 2B033…
 */
export function departementOf(codeInsee: string): string {
  return codeInsee.startsWith("97") ? codeInsee.slice(0, 3) : codeInsee.slice(0, 2);
}

export class SecurityDatabaseProvider implements SecurityProvider {
  private static cache = new InMemoryCache<SecurityAnalysis | null>(SEVEN_DAYS);

  async getSecurityData(codeInsee: string): Promise<SecurityAnalysis | null> {
    const cached = SecurityDatabaseProvider.cache.get(codeInsee);
    if (cached !== undefined) return cached;

    const codeDepartement = departementOf(codeInsee);
    const indicateurs = [...SECURITY_INDICATORS];

    try {
      const [communeRows, referenceRows] = await Promise.all([
        query<CommuneRow>(
          `SELECT c.annee, c.indicateur, c.taux_pour_mille, c.denominateur, i.base
             FROM crime_commune c
             JOIN crime_indicateur i ON i.indicateur = c.indicateur
            WHERE c.code_commune = $1 AND c.indicateur = ANY($2)
            ORDER BY c.annee`,
          [codeInsee, indicateurs],
        ),
        query<ReferenceRow>(
          `SELECT code, annee, indicateur, taux_pour_mille
             FROM crime_reference
            WHERE code = ANY($1) AND indicateur = ANY($2)`,
          [[codeDepartement, "FRANCE"], indicateurs],
        ),
      ]);

      if (communeRows.length === 0) {
        SecurityDatabaseProvider.cache.set(codeInsee, null);
        return null;
      }

      const annees = Array.from(new Set(communeRows.map((r) => Number(r.annee)))).sort();
      const indexOf = new Map(annees.map((a, i) => [a, i]));

      const refIndex = new Map<string, number>();
      for (const r of referenceRows) {
        refIndex.set(`${r.code}|${r.indicateur}|${r.annee}`, Number(r.taux_pour_mille));
      }

      const result: SecurityIndicator[] = [];
      for (const indicateur of indicateurs) {
        const rows = communeRows.filter((r) => r.indicateur === indicateur);
        if (rows.length === 0) continue;

        const empty = () => annees.map(() => null as number | null);
        const item: SecurityIndicator = {
          indicateur,
          base: rows[0].base === "logements" ? "logements" : "habitants",
          commune: empty(),
          borneBasse: empty(),
          borneHaute: empty(),
          departement: empty(),
          france: empty(),
        };

        for (const row of rows) {
          const i = indexOf.get(Number(row.annee));
          if (i === undefined) continue;

          if (row.taux_pour_mille !== null) {
            item.commune[i] = Number(row.taux_pour_mille);
          } else if (row.denominateur > 0) {
            // Valeur masquée : on connaît l'encadrement, on le convertit en taux.
            const rate = (facts: number) => (facts / row.denominateur) * 1000;
            item.borneBasse[i] = round4(rate(MASKED_MIN_FACTS));
            item.borneHaute[i] = round4(rate(MASKED_MAX_FACTS));
          }
        }

        for (const [i, annee] of annees.entries()) {
          item.departement[i] = refIndex.get(`${codeDepartement}|${indicateur}|${annee}`) ?? null;
          item.france[i] = refIndex.get(`FRANCE|${indicateur}|${annee}`) ?? null;
        }

        result.push(item);
      }

      if (result.length === 0) {
        SecurityDatabaseProvider.cache.set(codeInsee, null);
        return null;
      }

      const analysis: SecurityAnalysis = { annees, codeDepartement, indicateurs: result };
      SecurityDatabaseProvider.cache.set(codeInsee, analysis);
      return analysis;
    } catch (error) {
      console.warn("SecurityDatabaseProvider error:", error);
      return null;
    }
  }
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
