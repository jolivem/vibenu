import type { MobilityLabel, RiskLevel, ConfidenceLevel } from "../../../shared/domain/common.types.js";

export interface SummaryInput {
  mobilityLabel: MobilityLabel;
  riskLevel: RiskLevel;
  realEstateConfidence?: ConfidenceLevel;
  addressLabel: string;
}
