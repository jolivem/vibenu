import type { ConfidenceLevel, PriceLevel } from "../../../shared/domain/common.types.js";
import type { DvfTransactionFeature } from "../domain/real-estate.types.js";

export interface RealEstateProvider {
  getNearbyTransactions(
    lat: number,
    lon: number,
    radiusMeters: number,
    codeInsee?: string,
  ): Promise<{
    nearbyTransactionsCount?: number;
    priceLevel?: PriceLevel;
    confidence?: ConfidenceLevel;
    medianPricePerSquareMeter?: number;
    transactionFeatures?: DvfTransactionFeature[];
  }>;
}
