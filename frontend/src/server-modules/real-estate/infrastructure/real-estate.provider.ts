import type { ConfidenceLevel, PriceLevel } from "../../../server-shared/domain/common.types";
import type { DvfTransactionFeature } from "../domain/real-estate.types";

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
