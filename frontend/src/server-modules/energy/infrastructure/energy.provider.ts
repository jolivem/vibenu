import type { DpeCounts, DpeDistribution } from "../domain/energy.types";

/** Un DPE géolocalisé, avec ce qu'il faut pour l'afficher et repérer les doublons. */
export interface DpePoint {
  numero: string;
  date: string;
  etiquette: string;
  ges: string | null;
  surface: number | null;
  consoM2: number | null;
  periodeConstruction: string | null;
  /**
   * Complément d'adresse saisi par le diagnostiqueur (« Esc. A ; Étage 1 »). Sert seulement
   * à reconnaître un même logement diagnostiqué plusieurs fois : il ne sort jamais du module.
   */
  complement: string | null;
  identifiantBan: string | null;
  lat: number;
  lon: number;
}

export interface EnergyProvider {
  /**
   * DPE de logements placés au point même (à `radiusMeters` près), quelle que soit la qualité
   * de géocodage : un DPE posé exactement au point BAN de l'adresse est à cette adresse. Lève
   * en cas d'échec.
   */
  getPointsAt(lat: number, lon: number, radiusMeters: number): Promise<DpePoint[]>;
  /** Répartition des DPE de logements d'une commune. Lève en cas d'échec. */
  getCommuneDistribution(codeCommune: string): Promise<DpeDistribution>;
  /** Répartition nationale et date de mise à jour du jeu. Lève en cas d'échec. */
  getFranceDistribution(): Promise<{ distribution: DpeDistribution; miseAJour: string | null }>;
}

export function emptyCounts(): DpeCounts {
  return { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 };
}
