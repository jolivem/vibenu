import type { SecurityService } from "./security.service";
import type { SecurityAnalysis } from "../domain/security.types";
import type { SecurityProvider } from "../infrastructure/security.provider";

export class SecurityServiceImpl implements SecurityService {
  constructor(private readonly provider: SecurityProvider) {}

  async getSecurityData(codeInsee: string | undefined): Promise<SecurityAnalysis | null> {
    if (!codeInsee) return null;
    return this.provider.getSecurityData(codeInsee);
  }
}
