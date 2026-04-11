import type { RiskCategory } from "../domain/risk.types.js";

export interface RiskProvider {
  getLocationRisks(lat: number, lon: number): Promise<RiskCategory[]>;
}
