import type { ClimateNormales, ClimateProvider } from "./climate.provider";
import type { ClimateMonthlySeries } from "../domain/climate.types";
import { FRANCE_NORMALES, REFERENCE_CLIMATES } from "../domain/reference-climates";
import { query } from "../../../server-shared/infrastructure/database/postgres";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

type MetricColumn = "temperature_c" | "precipitation_mm" | "sunshine_hours";

/**
 * Rayon max par métrique. La pluviométrie et la température sont mesurées
 * dans la plupart des stations Météo-France ; l'héliographe ne couvre qu'une
 * trentaine de stations en France → on autorise un rayon plus large pour ne
 * pas perdre la donnée d'ensoleillement en zones peu instrumentées.
 */
const RADIUS_METERS: Record<MetricColumn, number> = {
  temperature_c: 30_000,
  precipitation_mm: 30_000,
  sunshine_hours: 100_000,
};

interface MetricStation {
  stationId: string;
  value: number;
  stationName: string;
  distanceKm: number;
}

interface MetricRow {
  station_id: string;
  station_name: string;
  value: string | number;
  distance_meters: number;
}

interface MonthlyRow {
  station_id: string;
  month: number;
  temperature_c: string | null;
  precipitation_mm: string | null;
  sunshine_hours: string | null;
}

/** 12 cases vides — janvier en index 0. */
function emptyMonths(): (number | null)[] {
  return Array.from({ length: 12 }, () => null);
}

function toNumber(v: string | null): number | null {
  return v === null ? null : Number(v);
}

/**
 * Provider climat basé sur les normales par station Météo-France (1991-2020)
 * pré-importées en base via scripts/import_climate_stations.py.
 *
 * Stratégie : pour chaque métrique (température / précipitations / ensoleillement),
 * sélectionne la station la plus proche **qui dispose de cette métrique** (la liste
 * des stations équipées varie : ~30 héliographes seulement en France). Si aucune
 * station n'est trouvée pour aucune métrique, retourne null (section masquée côté UI).
 *
 * Le profil mensuel suit la même règle : chaque mesure est lue sur la station qui a
 * fourni sa valeur annuelle, donc une série locale peut mélanger jusqu'à trois
 * stations. C'est assumé — et c'est pourquoi la card les nomme mesure par mesure.
 */
export class MeteoFranceStationsProvider implements ClimateProvider {
  private static cache = new InMemoryCache<ClimateNormales | null>(THIRTY_DAYS);
  private static readonly CACHE_PRECISION = 1; // ~11 km — adjacent points partagent la même station

  async getNormales(lat: number, lon: number): Promise<ClimateNormales | null> {
    const cacheKey = buildGeoKey(lat, lon, MeteoFranceStationsProvider.CACHE_PRECISION);
    const cached = MeteoFranceStationsProvider.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const [temp, precip, sun] = await Promise.all([
        this.findClosestWithMetric(lat, lon, "temperature_c"),
        this.findClosestWithMetric(lat, lon, "precipitation_mm"),
        this.findClosestWithMetric(lat, lon, "sunshine_hours"),
      ]);

      // Station de référence affichée : la plus proche disposant de la température
      // (statistiquement la plus courante). À défaut : précipitations, puis ensoleillement.
      const refStation = temp ?? precip ?? sun;
      if (!refStation) {
        MeteoFranceStationsProvider.cache.set(cacheKey, null);
        return null;
      }

      const result: ClimateNormales = {
        temperatureC: temp?.value ?? null,
        precipitationMm: precip?.value ?? null,
        sunshineHours: sun?.value ?? null,
        station: {
          name: refStation.stationName,
          distanceKm: refStation.distanceKm,
        },
        stationsByMetric: {
          ...(temp && { temperature: { name: temp.stationName, distanceKm: temp.distanceKm } }),
          ...(precip && { precipitation: { name: precip.stationName, distanceKm: precip.distanceKm } }),
          ...(sun && { sunshine: { name: sun.stationName, distanceKm: sun.distanceKm } }),
        },
        monthly: await this.buildMonthly({ temp, precip, sun }),
      };
      MeteoFranceStationsProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.warn("MeteoFranceStationsProvider error:", error);
      return null;
    }
  }

  /**
   * Sélectionne la station la plus proche d'un point qui dispose d'une mesure
   * non-nulle pour la métrique demandée, dans le rayon configuré.
   *
   * Note sécurité : `column` est strictement typé (union de littéraux) — pas
   * d'injection SQL possible via l'interpolation.
   */
  private async findClosestWithMetric(
    lat: number,
    lon: number,
    column: MetricColumn,
  ): Promise<MetricStation | null> {
    const radius = RADIUS_METERS[column];
    const rows = await query<MetricRow>(
      `SELECT
         station_id,
         station_name,
         ${column} AS value,
         ST_Distance(geom::geography, ST_MakePoint($2, $1)::geography) AS distance_meters
       FROM climate_station_normales
       WHERE ${column} IS NOT NULL
         AND ST_DWithin(geom::geography, ST_MakePoint($2, $1)::geography, $3)
       ORDER BY geom <-> ST_SetSRID(ST_MakePoint($2, $1), 4326)
       LIMIT 1`,
      [lat, lon, radius],
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      stationId: row.station_id,
      value: Number(row.value),
      stationName: row.station_name,
      distanceKm: Math.round((Number(row.distance_meters) / 1000) * 10) / 10,
    };
  }

  /**
   * Construit la série locale sur 12 mois et celles des villes de référence.
   *
   * Une seule requête couvre l'union des stations locales et de référence : elles
   * sont au plus six, et les lire séparément multiplierait les allers-retours sans
   * rien simplifier.
   */
  private async buildMonthly(local: {
    temp: MetricStation | null;
    precip: MetricStation | null;
    sun: MetricStation | null;
  }): Promise<ClimateNormales["monthly"]> {
    const referenceIds = REFERENCE_CLIMATES.map((r) => r.stationId);
    const localIds = [local.temp, local.precip, local.sun]
      .filter((s): s is MetricStation => s !== null)
      .map((s) => s.stationId);
    const ids = Array.from(new Set([...localIds, ...referenceIds]));
    if (ids.length === 0) return null;

    const rows = await query<MonthlyRow>(
      `SELECT station_id, month, temperature_c, precipitation_mm, sunshine_hours
         FROM climate_station_monthly_normales
        WHERE station_id = ANY($1)`,
      [ids],
    );
    if (rows.length === 0) return null;

    // Indexé par station puis par mois, pour piocher chaque mesure sur SA station.
    const byStation = new Map<string, Map<number, MonthlyRow>>();
    for (const row of rows) {
      let months = byStation.get(row.station_id);
      if (!months) {
        months = new Map();
        byStation.set(row.station_id, months);
      }
      months.set(Number(row.month), row);
    }

    const pick = (
      station: MetricStation | null,
      column: "temperature_c" | "precipitation_mm" | "sunshine_hours",
    ): (number | null)[] => {
      if (!station) return emptyMonths();
      const months = byStation.get(station.stationId);
      if (!months) return emptyMonths();
      return Array.from({ length: 12 }, (_, i) => toNumber(months.get(i + 1)?.[column] ?? null));
    };

    const localSeries: ClimateMonthlySeries = {
      name: "Cette adresse",
      temperatureC: pick(local.temp, "temperature_c"),
      precipitationMm: pick(local.precip, "precipitation_mm"),
      sunshineHours: pick(local.sun, "sunshine_hours"),
    };

    const references: ClimateMonthlySeries[] = REFERENCE_CLIMATES.flatMap((ref) => {
      const months = byStation.get(ref.stationId);
      if (!months) return [];
      const column = (c: "temperature_c" | "precipitation_mm" | "sunshine_hours") =>
        Array.from({ length: 12 }, (_, i) => toNumber(months.get(i + 1)?.[c] ?? null));
      return [{
        name: ref.name,
        climateType: ref.climateType,
        stationName: ref.stationName,
        temperatureC: column("temperature_c"),
        precipitationMm: column("precipitation_mm"),
        sunshineHours: column("sunshine_hours"),
      }];
    });

    return { local: localSeries, references };
  }

  async getNationalNormales(): Promise<ClimateNormales | null> {
    return { ...FRANCE_NORMALES };
  }
}
