import type { ElectionsAnalysis } from "../domain/elections.types";

export interface ElectionsProvider {
  /** Retourne les résultats commune + agrégat national, ou null si pas de données pour ce code INSEE. */
  getResults(codeInsee: string): Promise<ElectionsAnalysis | null>;
}
