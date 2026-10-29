import type { CatnatHistory } from "../domain/risk.types";
import { query } from "../../../server-shared/infrastructure/database/postgres";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";
import { communeMere } from "../../../server-shared/domain/commune-code";

const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * Exposition aux argiles lue sur la carte 2026 importée : `niveau` 0 (hors zone) à 3 (fort),
 * ou `covered: false` là où la carte ne dit rien — la ville de Paris.
 */
export type ClayExposure = { covered: true; niveau: 0 | 1 | 2 | 3 } | { covered: false };

/**
 * Ce que l'on sait des risques sans appeler l'API Géorisques (PLAN-GEORISQUES.md, phase 1) :
 * la carte d'exposition aux argiles et les arrêtés de catastrophe naturelle, importés par
 * scripts/import_argiles.py et scripts/import_catnat.py.
 *
 * Ne lève jamais : une table absente ou une base injoignable rendent `null`, et la card
 * s'affiche comme avant l'import.
 */
export class PostgisLocalRiskProvider {
  private static clayCache = new InMemoryCache<ClayExposure | null>(ONE_DAY);
  private static catnatCache = new InMemoryCache<CatnatHistory | null>(ONE_DAY);

  async getClayExposure(lat: number, lon: number, citycode?: string): Promise<ClayExposure | null> {
    // La carte 2026 exclut la ville de Paris : aucune zone n'y est tracée, ce qui ne veut pas
    // dire « hors zone ».
    if (citycode && communeMere(citycode).code === "75056") return { covered: false };
    const key = buildGeoKey(lat, lon);
    const cached = PostgisLocalRiskProvider.clayCache.get(key);
    if (cached !== undefined) return cached;
    try {
      // `loaded` : une table vide (import non lancé) ne doit pas se lire « hors zone ».
      const rows = await query<{ niveau: number | null; loaded: boolean }>(
        `SELECT (SELECT MAX(niveau) FROM argiles_exposition
                  WHERE ST_Intersects(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))) AS niveau,
                EXISTS (SELECT 1 FROM argiles_exposition) AS loaded`,
        [lon, lat],
      );
      if (!rows[0]?.loaded) return null;
      const niveau = Number(rows[0]?.niveau ?? 0) as 0 | 1 | 2 | 3;
      const result: ClayExposure = { covered: true, niveau };
      PostgisLocalRiskProvider.clayCache.set(key, result);
      return result;
    } catch (error) {
      console.warn("Argiles (carte importée) :", error);
      return null;
    }
  }

  async getCatnat(citycode: string): Promise<CatnatHistory | null> {
    const { code, villeEntiere } = communeMere(citycode);
    const cached = PostgisLocalRiskProvider.catnatCache.get(code);
    if (cached !== undefined) return cached;
    try {
      const [perils, meta] = await Promise.all([
        query<{ risque_code: string; n: string; last_year: number }>(
          `SELECT risque_code, COUNT(*) AS n, MAX(EXTRACT(YEAR FROM date_debut))::int AS last_year
             FROM catnat_arrete
            WHERE code_commune = $1
            GROUP BY risque_code
            ORDER BY COUNT(*) DESC, MAX(date_debut) DESC`,
          [code],
        ),
        query<{ date_donnees: string | null }>(
          `SELECT to_char(date_donnees, 'YYYY-MM-DD') AS date_donnees FROM georisques_import WHERE jeu = 'catnat'`,
        ),
      ]);
      // Sans ligne d'import, la table est vide : « aucune catastrophe » serait faux.
      if (meta.length === 0) return null;
      const result: CatnatHistory = {
        total: perils.reduce((sum, p) => sum + Number(p.n), 0),
        perils: perils.map((p) => ({ code: p.risque_code, count: Number(p.n), lastYear: p.last_year })),
        villeEntiere,
        dataUpTo: meta[0].date_donnees,
      };
      PostgisLocalRiskProvider.catnatCache.set(code, result);
      return result;
    } catch (error) {
      console.warn("Catastrophes naturelles (GASPAR importé) :", error);
      return null;
    }
  }
}
