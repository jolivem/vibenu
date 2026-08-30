import { query } from "../../../server-shared/infrastructure/database/postgres";
import { InMemoryCache } from "../../../server-shared/infrastructure/cache/in-memory-cache";
import type { MunicipalesAnalysis, MunicipalesListe } from "../domain/municipales.types";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export interface MunicipalesProvider {
  getResults(codeInsee: string): Promise<MunicipalesAnalysis | null>;
}

/**
 * Le fichier du ministère ne connaît que les communes : Paris est `75056`, jamais
 * `75101`. On rabat donc l'arrondissement sur sa ville, et l'écran le signale.
 *
 * Un fichier « conseils d'arrondissement » existe, mais il est découpé par *secteur* —
 * « Paris Centre » couvre les arrondissements 1 à 4, chaque secteur marseillais en couvre
 * deux — donc sans correspondance bijective avec les codes INSEE. Le conseil municipal se
 * jouant à l'échelle de la ville, le résultat communal reste la bonne réponse.
 */
export function communeMere(codeInsee: string): { code: string; villeEntiere: boolean } {
  if (/^751\d\d$/.test(codeInsee)) return { code: "75056", villeEntiere: true };
  if (/^6938\d$/.test(codeInsee)) return { code: "69123", villeEntiere: true };
  if (/^132\d\d$/.test(codeInsee)) return { code: "13055", villeEntiere: true };
  return { code: codeInsee, villeEntiere: false };
}

interface CommuneRow {
  tour: number;
  inscrits: number;
  votants: number;
  exprimes: number;
}

interface ListeRow {
  panneau: number;
  nuance: string | null;
  libelle: string;
  tete_de_liste: string | null;
  voix: number;
  pct_exprimes: string | number;
  sieges_cm: number | null;
  pct_national: string | number | null;
}

export class MunicipalesDatabaseProvider implements MunicipalesProvider {
  private static cache = new InMemoryCache<MunicipalesAnalysis | null>(SEVEN_DAYS);

  async getResults(codeInsee: string): Promise<MunicipalesAnalysis | null> {
    const cached = MunicipalesDatabaseProvider.cache.get(codeInsee);
    if (cached !== undefined) return cached;

    const { code, villeEntiere } = communeMere(codeInsee);

    try {
      // Tour décisif : une commune n'est au second tour que si le premier n'a pas suffi.
      const communeRows = await query<CommuneRow>(
        `SELECT tour, inscrits, votants, exprimes
           FROM municipales_2026_commune
          WHERE code_commune = $1
          ORDER BY tour DESC
          LIMIT 1`,
        [code],
      );
      const commune = communeRows[0];
      if (!commune || !commune.inscrits) {
        MunicipalesDatabaseProvider.cache.set(codeInsee, null);
        return null;
      }

      const rows = await query<ListeRow>(
        `SELECT l.panneau, l.nuance, l.libelle, l.tete_de_liste, l.voix,
                l.pct_exprimes, l.sieges_cm, f.pct_exprimes AS pct_national
           FROM municipales_2026_listes l
           LEFT JOIN municipales_2026_france f
                  ON f.tour = l.tour AND f.nuance = l.nuance
          WHERE l.code_commune = $1 AND l.tour = $2
          ORDER BY l.pct_exprimes DESC`,
        [code, commune.tour],
      );
      if (rows.length === 0) {
        MunicipalesDatabaseProvider.cache.set(codeInsee, null);
        return null;
      }

      const listes: MunicipalesListe[] = rows.map((r) => ({
        panneau: Number(r.panneau),
        nuance: r.nuance,
        libelle: r.libelle,
        teteDeListe: r.tete_de_liste,
        voix: Number(r.voix),
        pctExprimes: Number(r.pct_exprimes),
        pctNational: r.pct_national === null ? null : Number(r.pct_national),
        siegesCm: r.sieges_cm === null ? null : Number(r.sieges_cm),
      }));

      const analysis: MunicipalesAnalysis = {
        tour: commune.tour === 2 ? 2 : 1,
        inscrits: Number(commune.inscrits),
        participationPct:
          Math.round((Number(commune.votants) / Number(commune.inscrits)) * 1000) / 10,
        nuancee: listes.some((l) => l.nuance !== null),
        villeEntiere,
        listes,
      };
      MunicipalesDatabaseProvider.cache.set(codeInsee, analysis);
      return analysis;
    } catch (error) {
      console.warn("MunicipalesDatabaseProvider error:", error);
      return null;
    }
  }
}
