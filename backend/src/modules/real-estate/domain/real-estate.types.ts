import type { ConfidenceLevel, PriceLevel } from "../../../shared/domain/common.types.js";

export interface DvfTransactionFeature {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties: {
    pricePerSqm: number;
    price: number;
    surface: number;
    date: string;
    propertyType: string;
  };
}

export interface RealEstateAnalysis {
  nearbyTransactionsCount?: number;
  priceLevel?: PriceLevel;
  confidence?: ConfidenceLevel;
  score: number;
  medianPricePerSquareMeter?: number;
  transactionFeatures?: DvfTransactionFeature[];
}
