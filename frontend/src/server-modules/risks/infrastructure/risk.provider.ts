import type { RiskCategory } from "../domain/risk.types";

/**
 * L'échelle à laquelle lire le rapport Géorisques.
 *
 * L'API publie deux statuts par risque, l'un à l'adresse et l'autre à la commune.
 * « adresse » est le défaut — c'est ce que veut une analyse de logement. « commune » sert
 * les pages de ville, où le statut d'un point pris au centre n'aurait aucun sens.
 */
export type RiskScope = "adresse" | "commune";

export interface RiskProvider {
  getLocationRisks(lat: number, lon: number, scope?: RiskScope): Promise<RiskCategory[]>;
}
