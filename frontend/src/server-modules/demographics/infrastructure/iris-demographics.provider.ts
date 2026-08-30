import type { DemographicsProvider } from "./demographics.provider";
import type { AgeDistribution, AggregateStats, DemographicsAnalysis } from "../domain/demographics.types";
import type { ScopedStats } from "../domain/insee-profile.types";
import {
  blockNumber as num,
  buildEmploymentStats,
  buildHouseholdsStats,
  buildHousingStats,
  type InseeBlock,
} from "./insee-blocks";
import { query } from "../../../server-shared/infrastructure/database/postgres";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

interface RawRow {
  code_iris: string;
  nom_iris: string | null;
  nom_commune: string | null;
  area_km2: string | number | null;
  iris_geojson: string | null;
  commune_iris_count: number | null;
  /** Les quatre tables IRIS du point, fusionnées. */
  iris: InseeBlock;
  /** Lignes pré-agrégées de `insee_aggregate`. `null` si le scope n'existe pas. */
  commune: InseeBlock;
  france: InseeBlock;
}

function toNum(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Effectifs par tranche d'âge → parts entières. Même calcul aux trois échelles. */
function buildAgeDistribution(block: InseeBlock): AgeDistribution | null {
  const pop = num(block, "population");
  if (!pop || pop <= 0) return null;
  const share = (key: string) => Math.round(((num(block, key) ?? 0) / pop) * 100);
  return {
    pct0_14: share("pop_0_14"),
    pct15_29: share("pop_15_29"),
    pct30_44: share("pop_30_44"),
    pct45_59: share("pop_45_59"),
    pct60_74: share("pop_60_74"),
    pct75Plus: share("pop_75_plus"),
  };
}

function density(pop: number | null, areaKm2: number | null): number | null {
  return pop && areaKm2 && areaKm2 > 0 ? Math.round(pop / areaKm2) : null;
}

/** Un scope de `insee_aggregate` → les repères de la card Démographie. */
function buildAggregateStats(block: InseeBlock): AggregateStats | null {
  if (!block) return null;
  const population = num(block, "population");
  return {
    population,
    density: density(population, num(block, "area_km2")),
    ageDistribution: buildAgeDistribution(block),
    revenuMedian: num(block, "revenu_median"),
    tauxPauvrete: num(block, "taux_pauvrete"),
  };
}

/** Applique un même constructeur d'indicateurs aux trois échelles. */
function scoped<T>(
  build: (block: InseeBlock) => T | null,
  row: RawRow,
): ScopedStats<T> | null {
  const iris = build(row.iris);
  const commune = build(row.commune);
  const france = build(row.france);
  if (!iris && !commune && !france) return null;
  return { iris, commune, france };
}

/**
 * Une requête, sept lectures indexées : le contour qui contient le point (index GIST),
 * les trois tables INSEE du quartier et les deux lignes d'agrégat, toutes par clé
 * primaire.
 *
 * Les blocs partent en `to_jsonb` plutôt qu'en une centaine d'alias plats. Deux
 * précautions, sans lesquelles le résultat est faux plutôt qu'absent :
 *   - `to_jsonb` d'une jointure non appariée rend `{"code_iris": null, …}`, un objet
 *     bien non nul : le `CASE WHEN … IS NULL` est ce qui permet de masquer une card
 *     plutôt que d'en afficher une vide ;
 *   - on ne sérialise jamais une table portant `geom` — le WKB hexadécimal du contour
 *     partirait dans le JSON, soit des dizaines de Ko par requête. D'où le CTE, qui ne
 *     projette que les colonnes utiles.
 *
 * Un bénéfice de bord du `jsonb` : les `NUMERIC` en ressortent en nombres JSON, là où
 * le driver `pg` les rend en `string` au premier niveau.
 */
const SQL = `
  WITH iris AS (
    SELECT d.code_iris, d.nom_iris, d.nom_commune,
           d.population, d.pop_0_14, d.pop_15_29, d.pop_30_44,
           d.pop_45_59, d.pop_60_74, d.pop_75_plus,
           d.revenu_median, d.taux_pauvrete,
           ST_Area(d.geom::geography) / 1000000.0 AS area_km2,
           ST_AsGeoJSON(d.geom) AS iris_geojson
    FROM iris_demographics d
    WHERE ST_Contains(d.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
    LIMIT 1
  )
  SELECT
    i.code_iris, i.nom_iris, i.nom_commune, i.area_km2, i.iris_geojson,
    ac.iris_count AS commune_iris_count,
    to_jsonb(i) - 'iris_geojson'
      || CASE WHEN l.code_iris IS NULL THEN '{}'::jsonb ELSE to_jsonb(l) - 'code_iris' END
      || CASE WHEN e.code_iris IS NULL THEN '{}'::jsonb ELSE to_jsonb(e) - 'code_iris' END
      || CASE WHEN m.code_iris IS NULL THEN '{}'::jsonb ELSE to_jsonb(m) - 'code_iris' END AS iris,
    CASE WHEN ac.scope_code IS NULL THEN NULL ELSE to_jsonb(ac) END AS commune,
    CASE WHEN af.scope_code IS NULL THEN NULL ELSE to_jsonb(af) END AS france
  FROM iris i
  LEFT JOIN iris_logement    l ON l.code_iris = i.code_iris
  LEFT JOIN iris_emploi      e ON e.code_iris = i.code_iris
  LEFT JOIN iris_menages     m ON m.code_iris = i.code_iris
  LEFT JOIN insee_aggregate ac ON ac.scope_code = LEFT(i.code_iris, 5)
  LEFT JOIN insee_aggregate af ON af.scope_code = 'FRANCE'
`;

export class IrisDemographicsProvider implements DemographicsProvider {
  private static cache = new InMemoryCache<DemographicsAnalysis | null>(SEVEN_DAYS);

  async getDemographics(lat: number, lon: number): Promise<DemographicsAnalysis | null> {
    const cacheKey = buildGeoKey(lat, lon);
    const cached = IrisDemographicsProvider.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const rows = await query<RawRow>(SQL, [lon, lat]);

      if (rows.length === 0) {
        IrisDemographicsProvider.cache.set(cacheKey, null);
        return null;
      }

      const row = rows[0];
      const pop = num(row.iris, "population");

      const result: DemographicsAnalysis = {
        codeIris: row.code_iris,
        nomIris: row.nom_iris || "",
        nomCommune: row.nom_commune || "",
        population: pop,
        density: density(pop, toNum(row.area_km2)),
        ageDistribution: buildAgeDistribution(row.iris),
        revenuMedian: num(row.iris, "revenu_median"),
        tauxPauvrete: num(row.iris, "taux_pauvrete"),
        irisGeojson: row.iris_geojson || null,
        communeStats: buildAggregateStats(row.commune),
        nationalStats: buildAggregateStats(row.france),
        communeIrisCount: toNum(row.commune_iris_count) ?? 1,
        housing: scoped(buildHousingStats, row),
        employment: scoped(buildEmploymentStats, row),
        households: scoped(buildHouseholdsStats, row),
      };

      IrisDemographicsProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("IRIS demographics provider error:", error);
      return null;
    }
  }
}
