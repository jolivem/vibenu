import type { SchoolSector } from "../domain/school-sector.types";

export interface SchoolSectorProvider {
  /**
   * Renvoie le secteur collège attribué pour un point (lat, lon),
   * ou `null` si aucun secteur ne couvre cette position
   * (point hors Paris ou hors zone sectorisée).
   */
  getCollegeSectorForPoint(lat: number, lon: number): Promise<SchoolSector | null>;
}
