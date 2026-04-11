import type { RiskService } from "./risk.service.js";
import type { RiskAnalysis } from "../domain/risk.types.js";
import type { RiskProvider } from "../infrastructure/risk.provider.js";
export declare class RiskServiceImpl implements RiskService {
    private readonly riskProvider;
    constructor(riskProvider: RiskProvider);
    getRiskData(lat: number, lon: number): Promise<RiskAnalysis>;
}
