import { query } from "@/server-shared/infrastructure/database/postgres";
import type { GeoJsonGeometryDto } from "@/server-shared/types/location-analysis.dto";
import type {
  SchoolSector,
  SchoolSectorNiveau,
} from "../domain/school-sector.types";
import type { SchoolSectorProvider } from "./school-sector.provider";

interface SchoolSectorRow {
  niveau: SchoolSectorNiveau;
  territoire: string;
  code_uai: string | null;
  nom_etablissement: string;
  adresse: string | null;
  geometry: GeoJsonGeometryDto;
}

export class PostgisSchoolSectorProvider implements SchoolSectorProvider {
  async getCollegeSectorForPoint(lat: number, lon: number): Promise<SchoolSector | null> {
    try {
      const rows = await query<SchoolSectorRow>(
        `SELECT niveau,
                territoire,
                code_uai,
                nom_etablissement,
                adresse,
                ST_AsGeoJSON(geometry)::json AS geometry
         FROM school_sector
         WHERE niveau = 'college'
           AND ST_Contains(geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326))
         LIMIT 1`,
        [lon, lat],
      );
      const row = rows[0];
      if (!row) return null;
      return {
        niveau: row.niveau,
        territoire: row.territoire,
        codeUai: row.code_uai,
        nomEtablissement: row.nom_etablissement,
        adresse: row.adresse,
        geometry: row.geometry,
      };
    } catch (error) {
      console.warn(`school_sector lookup error for (${lat}, ${lon}):`, error);
      return null;
    }
  }
}
