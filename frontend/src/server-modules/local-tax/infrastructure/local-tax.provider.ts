import type { LocalTaxAnalysis } from "../domain/local-tax.types";

export interface LocalTaxProvider {
  /** Retourne null si aucun des quatre blocs n'a de donnée pour la commune. */
  getLocalTax(codeInsee: string): Promise<LocalTaxAnalysis | null>;
}
