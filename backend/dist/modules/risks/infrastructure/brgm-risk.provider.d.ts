import type { RiskCategory } from "../domain/risk.types.js";
import type { RiskProvider } from "./risk.provider.js";
/**
 * Risk provider using Géorisques API v1
 * Uses the comprehensive report endpoint for a single-call risk assessment
 * API doc: https://www.georisques.gouv.fr/doc-api
 * Rate limit: 1 call/s on resultats_rapport_risque
 */
export declare class GeorisquesRiskProvider implements RiskProvider {
    private readonly baseUrl;
    private readonly riskLabels;
    getLocationRisks(lat: number, lon: number): Promise<RiskCategory[]>;
    private parseRapport;
    private mapRisque;
    private parseLevel;
    private buildMessage;
    private getDefaultRisks;
}
