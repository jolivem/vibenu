import type { SchoolSector } from "../domain/school-sector.types";

export interface SchoolSectorService {
  /** Secteur collège attribué pour un point, `null` si non sectorisé. */
  getCollegeSector(lat: number, lon: number): Promise<SchoolSector | null>;
}
