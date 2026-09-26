import type { FloodWindow, FloodZone, RiskAnalysis } from "../domain/risk.types";
import type { RiskScope } from "../infrastructure/risk.provider";

export interface RiskService {
  getRiskData(lat: number, lon: number, scope?: RiskScope): Promise<RiskAnalysis>;
  /**
   * Les emprises de PPR inondation d'une fenêtre, pour la carte.
   *
   * Méthode à part et non champ de `getRiskData` : les pages commune SEO appellent
   * celui-ci pour lister les risques en texte, et n'ont pas de carte où poser une
   * géométrie. Les faire payer ce téléchargement serait gratuit.
   */
  getFloodZones(window: FloodWindow): Promise<FloodZone[]>;
}
