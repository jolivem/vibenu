import type { OmitNever } from "../../../shared/application/type-utils.js";
import type { ConfidenceLevel, PriceLevel } from "../../../shared/domain/common.types.js";

export interface RealEstateProvider {
  getNearbyTransactions(
    lat: number,
    lon: number,
    radiusMeters: number,
    codeInsee?: string,
  ): Promise<
    OmitNever<{
      nearbyTransactionsCount?: number;
      priceLevel?: PriceLevel;
      confidence?: ConfidenceLevel;
      medianPricePerSquareMeter?: number;
    }>
  >;
}
