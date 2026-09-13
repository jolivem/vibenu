import type { NeighborhoodPoi, PoiCategory } from "../domain/neighborhood.types";

export interface NeighborhoodProvider {
  findNearbyPois(lat: number, lon: number, radiusMeters: number): Promise<NeighborhoodPoi[]>;
  /**
   * Nombre d'équipements dédoublonnés par catégorie dans le rayon, sans plafond.
   * `null` quand le provider ne sait pas compter ou que le comptage a échoué.
   */
  countNearbyPois(lat: number, lon: number, radiusMeters: number): Promise<Partial<Record<PoiCategory, number>> | null>;
}
