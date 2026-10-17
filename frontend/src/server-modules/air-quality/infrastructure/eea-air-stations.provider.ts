import {
  ANNUAL_POLLUTANTS,
  ANNUAL_REFERENCES,
  type AnnualPollutantCode,
  type AnnualUnit,
  type AnnualPollutantStat,
  type StationArea,
} from "../domain/air-quality.types";
import type { AnnualAirQualityProvider } from "../application/air-quality.service";
import { query } from "../../../server-shared/infrastructure/database/postgres";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

/**
 * Au-delà, une station de fond urbaine ne dit plus rien de l'adresse : la pollution varie
 * d'une agglomération à l'autre.
 */
const RADIUS_METERS = 20_000;

/**
 * Repli pour les adresses sans station à moins de 20 km (campagne surtout) : une station de
 * fond **rurale** est implantée loin de toute source pour représenter une vaste zone, sa
 * mesure vaut donc pour la campagne alentour. Couvre ~90 % de la population, contre ~72 %
 * avec la seule règle des 20 km (mesuré sur les IRIS, octobre 2026).
 */
const RURAL_FALLBACK_RADIUS_METERS = 80_000;

/**
 * Une station n'est retenue que si elle a mesuré l'une des trois dernières années : la table
 * garde dix ans d'historique, et une station fermée en 2018 ne dit plus rien d'aujourd'hui.
 */
const RECENT_YEARS = 3;

interface StationRow {
  station_code: string;
  pollutant: AnnualPollutantCode;
  station_name: string;
  area: StationArea;
  annee: number;
  value: string | number;
  unit: AnnualUnit;
  distance_meters: number;
  fallback: boolean;
}

interface HistoryRow {
  station_code: string;
  pollutant: AnnualPollutantCode;
  annee: number;
  value: string | number;
}

interface NationalRow {
  pollutant: AnnualPollutantCode;
  annee: number;
  mean: string | number;
}

/**
 * Indicateurs annuels aux stations de mesure françaises (moyennes NO₂ / PM2,5 / PM10, jours
 * de dépassement d'ozone), importés depuis l'EEA (`scripts/import_air_quality_eea.py`).
 *
 * On ne retient que les stations de **fond** : une station trafic, posée au bord d'un axe,
 * mesure ce que respire le piéton du trottoir, pas l'habitant du quartier, et ferait
 * paraître toute adresse voisine plus polluée qu'elle ne l'est.
 */
export class EeaAirStationsProvider implements AnnualAirQualityProvider {
  private static cache = new InMemoryCache<AnnualPollutantStat[]>(THIRTY_DAYS);
  private static national: { value: Map<string, number>; expiresAt: number } | null = null;

  async getAnnualStats(lat: number, lon: number): Promise<AnnualPollutantStat[]> {
    const cacheKey = buildGeoKey(lat, lon);
    const cached = EeaAirStationsProvider.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Par polluant : la station de fond la plus proche à moins de 20 km, sinon la station
      // de fond rurale la plus proche à moins de 80 km ; puis sa dernière année mesurée.
      // Trier d'abord par année ferait préférer une station lointaine à jour à une voisine
      // dont la dernière mesure validée a un an de plus.
      const rows = await query<StationRow>(
        `WITH candidates AS (
           SELECT station_code, pollutant, station_name, area, annee, value, unit,
                  ST_Distance(geom::geography, ST_MakePoint($2, $1)::geography) AS distance_meters
             FROM air_quality_station_annual
            WHERE station_type = 'background'
              AND annee > (SELECT MAX(annee) FROM air_quality_station_annual) - $5
              AND ST_DWithin(geom::geography, ST_MakePoint($2, $1)::geography, $4)
         )
         SELECT DISTINCT ON (pollutant) *, distance_meters > $3 AS fallback
           FROM candidates
          WHERE distance_meters <= $3 OR area = 'rural'
          ORDER BY pollutant, distance_meters > $3, distance_meters, annee DESC`,
        [lat, lon, RADIUS_METERS, RURAL_FALLBACK_RADIUS_METERS, RECENT_YEARS],
      );
      const national = await this.nationalMeans();

      // Historique complet des stations retenues, en une requête pour tous les polluants.
      const historyRows = rows.length
        ? await query<HistoryRow>(
            `SELECT h.station_code, h.pollutant, h.annee, h.value
               FROM air_quality_station_annual h
               JOIN unnest($1::text[], $2::text[]) AS s(station_code, pollutant)
                 ON h.station_code = s.station_code AND h.pollutant = s.pollutant`,
            [rows.map((r) => r.station_code), rows.map((r) => r.pollutant)],
          )
        : [];

      const result = ANNUAL_POLLUTANTS.flatMap((code): AnnualPollutantStat[] => {
        const row = rows.find((r) => r.pollutant === code);
        if (!row) return [];
        const nationalMean = national.get(`${code}:${row.annee}`);
        if (nationalMean === undefined) return [];
        return [{
          code,
          value: Number(row.value),
          unit: row.unit,
          year: row.annee,
          stationName: row.station_name,
          distanceKm: Math.round((Number(row.distance_meters) / 1000) * 10) / 10,
          area: row.area,
          ruralFallback: row.fallback,
          nationalMean: Math.round(nationalMean * 10) / 10,
          reference: ANNUAL_REFERENCES[code].value,
          referenceKind: ANNUAL_REFERENCES[code].kind,
          history: buildHistory(code, row.station_code, historyRows, national),
        }];
      });

      EeaAirStationsProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.warn("EeaAirStationsProvider error:", error);
      return [];
    }
  }

  /** Moyenne des stations de fond françaises, par polluant et par année (clé `no2:2025`). */
  private async nationalMeans(): Promise<Map<string, number>> {
    const cached = EeaAirStationsProvider.national;
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const rows = await query<NationalRow>(
      `SELECT pollutant, annee, AVG(value) AS mean
         FROM air_quality_station_annual
        WHERE station_type = 'background'
        GROUP BY pollutant, annee`,
    );
    const value = new Map(rows.map((r) => [`${r.pollutant}:${r.annee}`, Number(r.mean)]));
    // Table encore vide (import pas encore lancé) : ne pas figer ce vide pour 30 jours.
    if (value.size > 0) {
      EeaAirStationsProvider.national = { value, expiresAt: Date.now() + THIRTY_DAYS };
    }
    return value;
  }
}

/**
 * Série de la station et moyenne France, alignées sur toutes les années connues pour ce
 * polluant (`null` les années où la station ne mesurait pas).
 */
function buildHistory(
  code: AnnualPollutantCode,
  stationCode: string,
  rows: HistoryRow[],
  national: Map<string, number>,
): AnnualPollutantStat["history"] {
  const years = [...national.keys()]
    .filter((k) => k.startsWith(`${code}:`))
    .map((k) => Number(k.slice(code.length + 1)))
    .sort((a, b) => a - b);
  const byYear = new Map(
    rows
      .filter((r) => r.station_code === stationCode && r.pollutant === code)
      .map((r) => [r.annee, Number(r.value)]),
  );
  const round = (v: number | undefined) => (v === undefined ? null : Math.round(v * 10) / 10);
  return {
    years,
    station: years.map((y) => round(byYear.get(y))),
    national: years.map((y) => round(national.get(`${code}:${y}`))),
  };
}
