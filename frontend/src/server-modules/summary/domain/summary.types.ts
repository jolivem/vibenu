import type { MobilityLabel, RiskLevel } from "../../../server-shared/domain/common.types";

export interface SummaryInput {
  mobilityLabel: MobilityLabel;
  riskLevel: RiskLevel;
  /** Nombre de ventes DVF retenues autour du point. Remplace l'ancien niveau de
   *  « Confiance », supprimé de la card : le seuil ci-dessous est celui qui faisait
   *  passer cette étiquette de « faible » à « moyenne ». */
  realEstateTransactionsCount?: number;
  addressLabel: string;
}
