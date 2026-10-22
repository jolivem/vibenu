import type { NearbySchools } from "../domain/schools.types";

export type SchoolsQuery = (
  | { scope: "rayon"; lat: number; lon: number }
  | { scope: "commune"; lat: number; lon: number; codeCommune: string }
) & {
  /**
   * Nom du collège de secteur de l'adresse (Paris), tel que l'écrit la carte scolaire
   * (« MADAME DE STAEL ») : celle-ci ne donne pas d'UAI, le rapprochement se fait par nom.
   */
  sectorCollege?: string | null;
};

export interface SchoolsProvider {
  /** `null` si la base ne répond pas. Ne lève jamais. */
  getNearbySchools(query: SchoolsQuery): Promise<NearbySchools | null>;
}
