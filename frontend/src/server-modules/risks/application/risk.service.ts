import type { RiskAnalysis } from "../domain/risk.types";

export interface RiskService {
  getRiskData(lat: number, lon: number): Promise<RiskAnalysis>;
}
