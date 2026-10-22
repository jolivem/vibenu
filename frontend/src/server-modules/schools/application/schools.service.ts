import type { NearbySchools } from "../domain/schools.types";

export interface SchoolsService {
  /**
   * Mode adresse : collèges et lycées autour du point. Mode commune : ceux de la commune
   * (`codeCommune`), la distance restant mesurée depuis le point.
   */
  getNearbySchools(
    lat: number,
    lon: number,
    options?: { codeCommune?: string; sectorCollege?: string | null },
  ): Promise<NearbySchools | null>;
}
