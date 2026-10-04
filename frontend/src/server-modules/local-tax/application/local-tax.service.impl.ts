import type { LocalTaxService } from "./local-tax.service";
import type { LocalTaxAnalysis } from "../domain/local-tax.types";
import type { LocalTaxProvider } from "../infrastructure/local-tax.provider";

export class LocalTaxServiceImpl implements LocalTaxService {
  constructor(private readonly provider: LocalTaxProvider) {}

  async getLocalTax(codeInsee: string | undefined): Promise<LocalTaxAnalysis | null> {
    if (!codeInsee) return null;
    return this.provider.getLocalTax(codeInsee);
  }
}
