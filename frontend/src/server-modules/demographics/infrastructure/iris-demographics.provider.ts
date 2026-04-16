import type { DemographicsProvider } from "./demographics.provider";
import type { DemographicsAnalysis } from "../domain/demographics.types";
import { query } from "../../../server-shared/infrastructure/database/neon";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

interface IrisRow {
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
}

/**
 * Demographics provider using INSEE IRIS data stored in PostgreSQL.
 */
export class IrisDemographicsProvider implements DemographicsProvider {
  private static cache = new InMemoryCache<DemographicsAnalysis | null>(SEVEN_DAYS);

  async getDemographics(lat: number, lon: number): Promise<DemographicsAnalysis | null> {
    const cacheKey = buildGeoKey(lat, lon);
    const cached = IrisDemographicsProvider.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const rows = await query<IrisRow>(
        `SELECT code_iris, nom_iris, nom_commune,
                population, pop_0_14, pop_15_29, pop_30_44, pop_45_59, pop_60_74, pop_75_plus,
                revenu_median, taux_pauvrete,
                ST_Area(geom::geography) / 1000000.0 AS area_km2,
                ST_AsGeoJSON(geom) AS iris_geojson
         FROM iris_demographics
         WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
         LIMIT 1`,
        [lon, lat],
      );

      if (rows.length === 0) {
        IrisDemographicsProvider.cache.set(cacheKey, null);
        return null;
      }

      const row = rows[0];
      const pop = row.population ? Number(row.population) : null;
      const areaKm2 = row.area_km2 ? Number(row.area_km2) : null;

      let ageDistribution: DemographicsAnalysis["ageDistribution"] = null;
      if (pop && pop > 0) {
        const p0 = Number(row.pop_0_14) || 0;
        const p15 = Number(row.pop_15_29) || 0;
        const p30 = Number(row.pop_30_44) || 0;
        const p45 = Number(row.pop_45_59) || 0;
        const p60 = Number(row.pop_60_74) || 0;
        const p75 = Number(row.pop_75_plus) || 0;

        ageDistribution = {
          pct0_14: Math.round((p0 / pop) * 100),
          pct15_29: Math.round((p15 / pop) * 100),
          pct30_44: Math.round((p30 / pop) * 100),
          pct45_59: Math.round((p45 / pop) * 100),
          pct60_74: Math.round((p60 / pop) * 100),
          pct75Plus: Math.round((p75 / pop) * 100),
        };
      }

      const result: DemographicsAnalysis = {
        codeIris: row.code_iris,
        nomIris: row.nom_iris || "",
        nomCommune: row.nom_commune || "",
        population: pop,
        density: pop && areaKm2 && areaKm2 > 0 ? Math.round(pop / areaKm2) : null,
        ageDistribution,
        revenuMedian: row.revenu_median ? Number(row.revenu_median) : null,
        tauxPauvrete: row.taux_pauvrete ? Number(row.taux_pauvrete) : null,
        irisGeojson: row.iris_geojson || null,
      };

      IrisDemographicsProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("IRIS demographics provider error:", error);
      return null;
    }
  }
}
