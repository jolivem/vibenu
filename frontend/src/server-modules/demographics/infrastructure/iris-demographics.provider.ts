import type { DemographicsProvider } from "./demographics.provider";
import type { AgeDistribution, AggregateStats, DemographicsAnalysis } from "../domain/demographics.types";
import { query } from "../../../server-shared/infrastructure/database/neon";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

interface RawRow {
  code_iris: string;
  nom_iris: string | null;
  nom_commune: string | null;
  population: number | null;
  pop_0_14: number | null;
  pop_15_29: number | null;
  pop_30_44: number | null;
  pop_45_59: number | null;
  pop_60_74: number | null;
  pop_75_plus: number | null;
  revenu_median: number | null;
  taux_pauvrete: number | null;
  area_km2: number | null;
  iris_geojson: string | null;

  commune_iris_count: number | null;
  commune_population: number | null;
  commune_pop_0_14: number | null;
  commune_pop_15_29: number | null;
  commune_pop_30_44: number | null;
  commune_pop_45_59: number | null;
  commune_pop_60_74: number | null;
  commune_pop_75_plus: number | null;
  commune_revenu_median: number | null;
  commune_taux_pauvrete: number | null;

  france_population: number | null;
  france_pop_0_14: number | null;
  france_pop_15_29: number | null;
  france_pop_30_44: number | null;
  france_pop_45_59: number | null;
  france_pop_60_74: number | null;
  france_pop_75_plus: number | null;
  france_revenu_median: number | null;
  france_taux_pauvrete: number | null;
}

function toNum(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildAgeDistribution(
  pop: number | null,
  p0: number | null,
  p15: number | null,
  p30: number | null,
  p45: number | null,
  p60: number | null,
  p75: number | null,
): AgeDistribution | null {
  if (!pop || pop <= 0) return null;
  return {
    pct0_14: Math.round(((p0 ?? 0) / pop) * 100),
    pct15_29: Math.round(((p15 ?? 0) / pop) * 100),
    pct30_44: Math.round(((p30 ?? 0) / pop) * 100),
    pct45_59: Math.round(((p45 ?? 0) / pop) * 100),
    pct60_74: Math.round(((p60 ?? 0) / pop) * 100),
    pct75Plus: Math.round(((p75 ?? 0) / pop) * 100),
  };
}

export class IrisDemographicsProvider implements DemographicsProvider {
  private static cache = new InMemoryCache<DemographicsAnalysis | null>(SEVEN_DAYS);
  private static nationalCache = new InMemoryCache<AggregateStats>(ONE_DAY);

  async getDemographics(lat: number, lon: number): Promise<DemographicsAnalysis | null> {
    const cacheKey = buildGeoKey(lat, lon);
    const cached = IrisDemographicsProvider.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const rows = await query<RawRow>(
        `WITH iris AS (
           SELECT code_iris, nom_iris, nom_commune,
                  population, pop_0_14, pop_15_29, pop_30_44, pop_45_59, pop_60_74, pop_75_plus,
                  revenu_median, taux_pauvrete,
                  ST_Area(geom::geography) / 1000000.0 AS area_km2,
                  ST_AsGeoJSON(geom) AS iris_geojson
           FROM iris_demographics
           WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
           LIMIT 1
         ),
         commune AS (
           SELECT
             COUNT(*)::int AS iris_count,
             SUM(i.population)::bigint AS population,
             SUM(i.pop_0_14)::bigint AS pop_0_14,
             SUM(i.pop_15_29)::bigint AS pop_15_29,
             SUM(i.pop_30_44)::bigint AS pop_30_44,
             SUM(i.pop_45_59)::bigint AS pop_45_59,
             SUM(i.pop_60_74)::bigint AS pop_60_74,
             SUM(i.pop_75_plus)::bigint AS pop_75_plus,
             SUM(i.revenu_median * i.population)
               / NULLIF(SUM(CASE WHEN i.revenu_median IS NOT NULL THEN i.population ELSE 0 END), 0)
               AS revenu_median,
             SUM(i.taux_pauvrete * i.population)
               / NULLIF(SUM(CASE WHEN i.taux_pauvrete IS NOT NULL THEN i.population ELSE 0 END), 0)
               AS taux_pauvrete
           FROM iris_demographics i
           WHERE LEFT(i.code_iris, 5) = (SELECT LEFT(code_iris, 5) FROM iris)
         ),
         france AS (
           SELECT
             SUM(i.population)::bigint AS population,
             SUM(i.pop_0_14)::bigint AS pop_0_14,
             SUM(i.pop_15_29)::bigint AS pop_15_29,
             SUM(i.pop_30_44)::bigint AS pop_30_44,
             SUM(i.pop_45_59)::bigint AS pop_45_59,
             SUM(i.pop_60_74)::bigint AS pop_60_74,
             SUM(i.pop_75_plus)::bigint AS pop_75_plus,
             SUM(i.revenu_median * i.population)
               / NULLIF(SUM(CASE WHEN i.revenu_median IS NOT NULL THEN i.population ELSE 0 END), 0)
               AS revenu_median,
             SUM(i.taux_pauvrete * i.population)
               / NULLIF(SUM(CASE WHEN i.taux_pauvrete IS NOT NULL THEN i.population ELSE 0 END), 0)
               AS taux_pauvrete
           FROM iris_demographics i
         )
         SELECT
           iris.code_iris, iris.nom_iris, iris.nom_commune,
           iris.population, iris.pop_0_14, iris.pop_15_29, iris.pop_30_44,
           iris.pop_45_59, iris.pop_60_74, iris.pop_75_plus,
           iris.revenu_median, iris.taux_pauvrete,
           iris.area_km2, iris.iris_geojson,
           commune.iris_count AS commune_iris_count,
           commune.population AS commune_population,
           commune.pop_0_14 AS commune_pop_0_14,
           commune.pop_15_29 AS commune_pop_15_29,
           commune.pop_30_44 AS commune_pop_30_44,
           commune.pop_45_59 AS commune_pop_45_59,
           commune.pop_60_74 AS commune_pop_60_74,
           commune.pop_75_plus AS commune_pop_75_plus,
           commune.revenu_median AS commune_revenu_median,
           commune.taux_pauvrete AS commune_taux_pauvrete,
           france.population AS france_population,
           france.pop_0_14 AS france_pop_0_14,
           france.pop_15_29 AS france_pop_15_29,
           france.pop_30_44 AS france_pop_30_44,
           france.pop_45_59 AS france_pop_45_59,
           france.pop_60_74 AS france_pop_60_74,
           france.pop_75_plus AS france_pop_75_plus,
           france.revenu_median AS france_revenu_median,
           france.taux_pauvrete AS france_taux_pauvrete
         FROM iris, commune, france`,
        [lon, lat],
      );

      if (rows.length === 0) {
        IrisDemographicsProvider.cache.set(cacheKey, null);
        return null;
      }

      const row = rows[0];
      const pop = toNum(row.population);
      const areaKm2 = toNum(row.area_km2);

      const irisAge = buildAgeDistribution(
        pop,
        toNum(row.pop_0_14),
        toNum(row.pop_15_29),
        toNum(row.pop_30_44),
        toNum(row.pop_45_59),
        toNum(row.pop_60_74),
        toNum(row.pop_75_plus),
      );

      const communePop = toNum(row.commune_population);
      const communeStats: AggregateStats = {
        population: communePop,
        ageDistribution: buildAgeDistribution(
          communePop,
          toNum(row.commune_pop_0_14),
          toNum(row.commune_pop_15_29),
          toNum(row.commune_pop_30_44),
          toNum(row.commune_pop_45_59),
          toNum(row.commune_pop_60_74),
          toNum(row.commune_pop_75_plus),
        ),
        revenuMedian: toNum(row.commune_revenu_median),
        tauxPauvrete: toNum(row.commune_taux_pauvrete),
      };

      const francePop = toNum(row.france_population);
      const nationalStats: AggregateStats = {
        population: francePop,
        ageDistribution: buildAgeDistribution(
          francePop,
          toNum(row.france_pop_0_14),
          toNum(row.france_pop_15_29),
          toNum(row.france_pop_30_44),
          toNum(row.france_pop_45_59),
          toNum(row.france_pop_60_74),
          toNum(row.france_pop_75_plus),
        ),
        revenuMedian: toNum(row.france_revenu_median),
        tauxPauvrete: toNum(row.france_taux_pauvrete),
      };
      IrisDemographicsProvider.nationalCache.set("france", nationalStats);

      const result: DemographicsAnalysis = {
        codeIris: row.code_iris,
        nomIris: row.nom_iris || "",
        nomCommune: row.nom_commune || "",
        population: pop,
        density: pop && areaKm2 && areaKm2 > 0 ? Math.round(pop / areaKm2) : null,
        ageDistribution: irisAge,
        revenuMedian: toNum(row.revenu_median),
        tauxPauvrete: toNum(row.taux_pauvrete),
        irisGeojson: row.iris_geojson || null,
        communeStats,
        nationalStats,
        communeIrisCount: toNum(row.commune_iris_count) ?? 1,
      };

      IrisDemographicsProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("IRIS demographics provider error:", error);
      return null;
    }
  }
}
