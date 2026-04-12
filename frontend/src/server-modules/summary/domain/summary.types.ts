import type { MobilityLabel, RiskLevel, ConfidenceLevel } from "../../../server-shared/domain/common.types";

export interface SummaryInput {
  mobilityLabel: MobilityLabel;
  riskLevel: RiskLevel;
  realEstateConfidence?: ConfidenceLevel;
  addressLabel: string;
}
