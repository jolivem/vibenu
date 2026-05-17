import type { GeoJsonGeometryDto } from "@/server-shared/types/location-analysis.dto";

export type SchoolSectorNiveau = "college" | "lycee";

/**
 * Secteur scolaire attribué à un point géographique.
 * Contient le polygone du secteur pour affichage cartographique
 * + identité de l'établissement attribué.
 */
export interface SchoolSector {
  niveau: SchoolSectorNiveau;
  territoire: string; // ex. "paris"
  codeUai: string | null;
  nomEtablissement: string;
  adresse: string | null;
  geometry: GeoJsonGeometryDto;
}
