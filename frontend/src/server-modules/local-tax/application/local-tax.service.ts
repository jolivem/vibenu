import type { LocalTaxAnalysis } from "../domain/local-tax.types";

export interface LocalTaxService {
  getLocalTax(codeInsee: string | undefined): Promise<LocalTaxAnalysis | null>;
}
