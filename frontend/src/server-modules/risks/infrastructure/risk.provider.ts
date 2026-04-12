import type { RiskCategory } from "../domain/risk.types";

export interface RiskProvider {
  getLocationRisks(lat: number, lon: number): Promise<RiskCategory[]>;
}
