import type { ConfidenceLevel, MobilityLabel, PriceLevel, RiskCategoryLevel, RiskLevel } from "../domain/common.types";

export type AddressSuggestionTypeDto =
  | "housenumber"
  | "street"
  | "locality"
  | "municipality";

export interface AddressSuggestionDto {
  id: string;
  label: string;
  street?: string;
  city: string;
  postcode: string;
  citycode?: string;
  type?: AddressSuggestionTypeDto;
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

export interface MobilityAnalysisDto {
  nearestStops: TransportStopDto[];
  nearestStation?: StationDto;
  label: MobilityLabel;
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
}

export interface DvfTransactionFeatureDto {
  type: "Feature";
  geometry: GeoJsonGeometryDto;
  properties: {
    pricePerSqm: number;
    price: number;
    surface: number;
    date: string;
    propertyType: string;
  };
}

export interface RealEstateAnalysisDto {
  nearbyTransactionsCount?: number;
  priceLevel?: PriceLevel;
  confidence?: ConfidenceLevel;
  medianPricePerSquareMeter?: number;
  transactionFeatures?: DvfTransactionFeatureDto[];
}

export interface AirQualityAnalysisDto {
  level: string;
  message: string;
  /** Présent uniquement quand NEXT_PUBLIC_DEBUG=true. */
  debugRaw?: unknown;
}

export interface NeighborhoodPoiDto {
  name: string;
  category: string;
  distanceMeters: number;
}

export interface NeighborhoodAnalysisDto {
  pois: NeighborhoodPoiDto[];
  label: string;
}

export interface SummaryDto {
  strengths: string[];
  warnings: string[];
  shortText: string;
}

export interface ElectionsCandidateDto {
  candidat: string;
  parti: string;
  panneau: number;
  pctCommune: number;
  pctNational: number;
}

export interface ElectionsAnalysisDto {
  scrutin: "presidentielle-2022-t1";
  inscrits: number;
  votants: number;
  exprimes: number;
  participationPct: number;
  nationalParticipationPct: number;
  candidates: ElectionsCandidateDto[];
}

export interface GeoJsonGeometryDto {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

export interface CadastreParcelDto {
  section: string;
  numero: string;
  contenance: number;
  commune: string;
  geometry: GeoJsonGeometryDto;
}

export interface UrbanZoneDto {
  code: string;
  label: string;
  type: string;
}

export interface UrbanPrescriptionDto {
  label: string;
  type: string;
}

export interface CadastreAnalysisDto {
  parcel: CadastreParcelDto | null;
  urbanZone: UrbanZoneDto | null;
  prescriptions: UrbanPrescriptionDto[];
}

export interface MapContextDto {
  center: {
    lat: number;
    lon: number;
  };
  zoom: number;
  /** Contour de la commune si l'analyse a été lancée sur un nom de commune (type=municipality). */
  communeContour?: GeoJsonGeometryDto;
}

export interface AgeDistributionDto {
  pct0_14: number;
  pct15_29: number;
  pct30_44: number;
  pct45_59: number;
  pct60_74: number;
  pct75Plus: number;
}

export interface AggregateStatsDto {
  population: number | null;
  ageDistribution: AgeDistributionDto | null;
  revenuMedian: number | null;
  tauxPauvrete: number | null;
}

export interface DemographicsAnalysisDto {
  codeIris: string;
  nomIris: string;
  nomCommune: string;
  population: number | null;
  density: number | null;
  ageDistribution: AgeDistributionDto | null;
  revenuMedian: number | null;
  tauxPauvrete: number | null;
  irisGeojson: string | null;
  communeStats: AggregateStatsDto | null;
  nationalStats: AggregateStatsDto | null;
  communeIrisCount: number;
}

export interface LocationAnalysisDto {
  address: SelectedAddressDto;
  map: MapContextDto;
  mobility: MobilityAnalysisDto;
  risks: RiskAnalysisDto;
  realEstate: RealEstateAnalysisDto;
  airQuality: AirQualityAnalysisDto;
  neighborhood: NeighborhoodAnalysisDto;
  demographics: DemographicsAnalysisDto | null;
  cadastre: CadastreAnalysisDto;
  summary: SummaryDto;
  elections?: ElectionsAnalysisDto | null;
}
