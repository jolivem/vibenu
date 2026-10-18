import { query } from "../../../server-shared/infrastructure/database/postgres";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";
import {
  RENT_TYPES,
  type RentAnalysis,
  type RentAreaFeature,
  type RentIndicator,
  type RentLevel,
  type RentType,
} from "../domain/rents.types";
import type { RentsProvider } from "./rents.provider";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/**
 * Rayon de la carte « alentour ». À 8 km, une commune de banlieue montre ses voisines et
 * la ville-centre (Versailles depuis Saint-Cyr-l'École) ; Paris 15e, les arrondissements
 * voisins et la proche couronne. Plafonné à `MAX_AREAS` communes, les plus proches d'abord :
 * environ 30 ko de contours simplifiés.
 */
const AREA_RADIUS_METERS = 8_000;
const MAX_AREAS = 60;
/**
 * Préfiltre sur l'emprise, en degrés : il laisse l'index GIST servir avant le calcul de
 * distance en `geography` (0,7 s sans lui, 20 ms avec). 0,15° couvre 8 km jusqu'au 60e
 * parallèle en longitude.
 */
const BBOX_DEGREES = 0.15;

/** Seuils de fiabilité donnés par le producteur. */
const MIN_ANNONCES = 30;
const MIN_R2 = 0.5;

interface IndicatorRow {
  nom: string | null;
  annee: number;
  type_bien: RentType;
  loyer_m2: string;
  ic_bas: string | null;
  ic_haut: string | null;
  niveau: RentLevel;
  nb_annonces: number;
  r2: string | null;
}

interface AreaRow {
  code_commune: string;
  nom: string | null;
  loyer_m2: string;
  niveau: RentLevel;
  geojson: string;
}

const num = (v: string | null): number | null => (v === null ? null : Number(v));

export class RentsDatabaseProvider implements RentsProvider {
  private static cache = new InMemoryCache<RentAnalysis | null>(SEVEN_DAYS);

  async getRents(codeInsee: string, lat: number, lon: number): Promise<RentAnalysis | null> {
    const cacheKey = `${codeInsee}:${buildGeoKey(lat, lon)}`;
    const cached = RentsDatabaseProvider.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    try {
      // Dernière édition seulement : les éditions ne se comparent pas entre elles.
      const rows = await query<IndicatorRow>(
        `SELECT nom, annee, type_bien, loyer_m2, ic_bas, ic_haut, niveau, nb_annonces, r2
           FROM rent_commune
          WHERE code_commune = $1
            AND annee = (SELECT MAX(annee) FROM rent_commune WHERE code_commune = $1)`,
        [codeInsee],
      );
      if (rows.length === 0) {
        RentsDatabaseProvider.cache.set(cacheKey, null);
        return null;
      }

      const annee = rows[0].annee;
      const indicateurs: RentIndicator[] = RENT_TYPES.flatMap((type) => {
        const r = rows.find((row) => row.type_bien === type);
        if (!r) return [];
        const r2 = num(r.r2);
        return [{
          type,
          loyerM2: Number(r.loyer_m2),
          icBas: num(r.ic_bas),
          icHaut: num(r.ic_haut),
          niveau: r.niveau,
          nbAnnonces: r.nb_annonces,
          fiable: r.nb_annonces >= MIN_ANNONCES && r2 !== null && r2 >= MIN_R2,
        }];
      });

      const alentour = await this.readAreas(codeInsee, annee, lat, lon);
      const result: RentAnalysis = {
        codeCommune: codeInsee,
        nomCommune: rows[0].nom,
        annee,
        indicateurs,
        alentour,
      };
      RentsDatabaseProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.warn("RentsDatabaseProvider error:", error);
      return null;
    }
  }

  /** Communes autour du point, loyer des appartements tous types. `[]` en cas d'échec : la card reste. */
  private async readAreas(codeInsee: string, annee: number, lat: number, lon: number): Promise<RentAreaFeature[]> {
    try {
      const rows = await query<AreaRow>(
        `SELECT s.code_commune, COALESCE(r.nom, s.nom) AS nom, r.loyer_m2, r.niveau, ST_AsGeoJSON(s.geom, 5) AS geojson
           FROM commune_shape s
           JOIN rent_commune r
             ON r.code_commune = s.code_commune AND r.type_bien = 'app' AND r.annee = $3
          WHERE s.geom && ST_Expand(ST_SetSRID(ST_MakePoint($2, $1), 4326), $4)
            AND ST_DWithin(s.geom::geography, ST_MakePoint($2, $1)::geography, $5)
          ORDER BY s.geom <-> ST_SetSRID(ST_MakePoint($2, $1), 4326)
          LIMIT $6`,
        [lat, lon, annee, BBOX_DEGREES, AREA_RADIUS_METERS, MAX_AREAS],
      );
      return rows.map((r) => ({
        type: "Feature",
        geometry: JSON.parse(r.geojson),
        properties: {
          code: r.code_commune,
          nom: r.nom ?? r.code_commune,
          loyerM2: Number(r.loyer_m2),
          niveau: r.niveau,
          courante: r.code_commune === codeInsee,
        },
      }));
    } catch (error) {
      console.warn("RentsDatabaseProvider areas error:", error);
      return [];
    }
  }
}
