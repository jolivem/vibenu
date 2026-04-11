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
  label: "faible" | "correct" | "bon" | "très bon";
  scoreBreakdown: MobilityScoreBreakdownDto;
}

export interface RiskCategoryDto {
  code: string;
  name: string;
  level: "absent" | "faible" | "modéré" | "élevé";
  message: string;
}

export interface RiskAnalysisDto {
  level: "faible" | "modéré" | "élevé";
  categories: RiskCategoryDto[];
  score: number;
}

export interface RealEstateAnalysisDto {
  nearbyTransactionsCount?: number;
  priceLevel?: "faible" | "moyen" | "élevé";
  confidence?: "faible" | "moyenne" | "élevée";
  score: number;
  medianPricePerSquareMeter?: number;
}

export interface ScoreBreakdownDto {
  globalScore: number;
  mobilityScore: number;
  riskScore: number;
  realEstateScore: number;
  environmentScore: number;
}

export interface SummaryDto {
  strengths: string[];
  warnings: string[];
  shortText: string;
}

export interface LocationAnalysisDto {
  address: SelectedAddressDto;
  map: {
    center: {
      lat: number;
      lon: number;
    };
    zoom: number;
  };
  scores: ScoreBreakdownDto;
  mobility: MobilityAnalysisDto;
  risks: RiskAnalysisDto;
  realEstate: RealEstateAnalysisDto;
  summary: SummaryDto;
}
