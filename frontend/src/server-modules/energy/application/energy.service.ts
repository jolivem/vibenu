import type { AnalysisMode } from "../../../server-shared/types/location-analysis.dto";
import type { EnergyAnalysis } from "../domain/energy.types";

export interface EnergyQuery {
  lat: number;
  lon: number;
  codeCommune: string | undefined;
  mode: AnalysisMode;
  /**
   * On cherche les DPE de l'adresse même : vrai pour un numéro de rue, et quand le type est
   * inconnu (lien ancien) — la tolérance de 2 m écarte tout faux positif.
   */
  atAddress: boolean;
}

export interface EnergyService {
  /** `null` si aucune source n'a répondu. Ne lève jamais. */
  getEnergy(query: EnergyQuery): Promise<EnergyAnalysis | null>;
}
