import type { RiskProvider } from "./risk.provider.js";
export declare class MockRiskProvider implements RiskProvider {
    getLocationRisks(): Promise<Array<{
        code: string;
        name: string;
        level: "absent" | "faible" | "modéré" | "élevé";
        message: string;
    }>>;
}
