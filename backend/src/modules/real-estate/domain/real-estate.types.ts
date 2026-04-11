import type { ConfidenceLevel, PriceLevel } from "../../../shared/domain/common.types.js";

export interface RealEstateAnalysis {
  nearbyTransactionsCount?: number;
  priceLevel?: PriceLevel;
  confidence?: ConfidenceLevel;
  score: number;
  medianPricePerSquareMeter?: number;
}
