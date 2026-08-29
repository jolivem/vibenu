import type { SecurityAnalysis } from "../domain/security.types";

export interface SecurityProvider {
  /** Retourne null si la commune est absente du fichier SSMSI. */
  getSecurityData(codeInsee: string): Promise<SecurityAnalysis | null>;
}
