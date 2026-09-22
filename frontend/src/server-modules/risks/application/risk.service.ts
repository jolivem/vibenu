import type { RiskAnalysis } from "../domain/risk.types";
import type { RiskScope } from "../infrastructure/risk.provider";

export interface RiskService {
  getRiskData(lat: number, lon: number, scope?: RiskScope): Promise<RiskAnalysis>;
}
