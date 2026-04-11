import type { RiskAnalysis } from "../domain/risk.types.js";
export interface RiskService {
    getRiskData(lat: number, lon: number): Promise<RiskAnalysis>;
}
