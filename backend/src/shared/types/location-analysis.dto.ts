import type { ConfidenceLevel, MobilityLabel, PriceLevel, RiskCategoryLevel, RiskLevel } from "../domain/common.types.js";

export interface AddressSuggestionDto {
  id: string;
  label: string;
  street?: string;
  city: string;
  postcode: string;
  latitude: number;
  longitude: number;
}

export interface SelectedAddressDto {
  label: string;
  city: string;
  postcode: string;
  latitude: number;
  longitude: number;
}

export interface TransportStopDto {
  id: string;
  name: string;
  distanceMeters: number;
  mode: string;
}

export interface StationDto {
  id: string;
  name: string;
  distanceMeters: number;
}

export interface MobilityScoreBreakdownDto {
  base: number;
  nearestStop: string;
  nearestStopPoints: number;
  station: string;
  stationPoints: number;
  density: string;
  densityPoints: number;
}

export interface MobilityAnalysisDto {
  nearestStops: TransportStopDto[];
  nearestStation?: StationDto;
  score: number;
  label: MobilityLabel;
  scoreBreakdown: MobilityScoreBreakdownDto;
}

export interface RiskCategoryDto {
  code: string;
  name: string;
  level: RiskCategoryLevel;
  message: string;
}

export interface RiskAnalysisDto {
  level: RiskLevel;
  categories: RiskCategoryDto[];
  score: number;
}

export interface RealEstateAnalysisDto {
  nearbyTransactionsCount?: number;
  priceLevel?: PriceLevel;
  confidence?: ConfidenceLevel;
  score: number;
  medianPricePerSquareMeter?: number;
}

export interface AirQualityAnalysisDto {
  score: number;
  level: string;
  message: string;
}

export interface NeighborhoodPoiDto {
  name: string;
  category: string;
  distanceMeters: number;
}

export interface NeighborhoodAnalysisDto {
  pois: NeighborhoodPoiDto[];
  score: number;
  label: string;
}

export interface ScoreBreakdownDto {
  globalScore: number;
  mobilityScore: number;
  riskScore: number;
  realEstateScore: number;
  environmentScore: number;
  neighborhoodScore: number;
}

export interface SummaryDto {
  strengths: string[];
  warnings: string[];
  shortText: string;
}

export interface MapContextDto {
  center: {
    lat: number;
    lon: number;
  };
  zoom: number;
}

export interface LocationAnalysisDto {
  address: SelectedAddressDto;
  map: MapContextDto;
  scores: ScoreBreakdownDto;
  mobility: MobilityAnalysisDto;
  risks: RiskAnalysisDto;
  realEstate: RealEstateAnalysisDto;
  airQuality: AirQualityAnalysisDto;
  neighborhood: NeighborhoodAnalysisDto;
  summary: SummaryDto;
}
