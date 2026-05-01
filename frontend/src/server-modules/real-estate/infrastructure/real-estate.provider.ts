import type { ConfidenceLevel, PriceLevel } from "../../../server-shared/domain/common.types";
import type { DvfTransactionFeature } from "../domain/real-estate.types";

export interface RealEstateMarketData {
  nearbyTransactionsCount?: number;
  priceLevel?: PriceLevel;
  confidence?: ConfidenceLevel;
  medianPricePerSquareMeter?: number;
  transactionFeatures?: DvfTransactionFeature[];
}

export interface RealEstateProvider {
  getNearbyTransactions(
    lat: number,
    lon: number,
    radiusMeters: number,
    codeInsee?: string,
  ): Promise<RealEstateMarketData>;

  /** Toutes les transactions DVF d'une commune, filtrées par code INSEE. */
  getCommuneTransactions(codeInsee: string): Promise<RealEstateMarketData>;
}
