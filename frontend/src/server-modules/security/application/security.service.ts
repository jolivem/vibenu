import type { SecurityAnalysis } from "../domain/security.types";

export interface SecurityService {
  getSecurityData(codeInsee: string | undefined): Promise<SecurityAnalysis | null>;
}
