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
  mode: string;
}

export interface MobilityAnalysisDto {
  nearestStops: TransportStopDto[];
  nearestStation?: StationDto;
  label: "faible" | "correct" | "bon" | "très bon";
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
  priceLevel?: "faible" | "moyen" | "élevé";
  confidence?: "faible" | "moyenne" | "élevée";
  medianPricePerSquareMeter?: number;
  transactionFeatures?: DvfTransactionFeatureDto[];
}

export interface AirQualityAnalysisDto {
  level: "bon" | "moyen" | "dégradé" | "mauvais" | "très_mauvais";
  message: string;
}

export interface SummaryDto {
  strengths: string[];
  warnings: string[];
  shortText: string;
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

export interface NeighborhoodPoiDto {
  name: string;
  category: string;
  distanceMeters: number;
}

export interface NeighborhoodAnalysisDto {
  pois: NeighborhoodPoiDto[];
  label: string;
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

export interface NarrativeDto {
  paragraph: string;
  generatedAt: string;
  cached: boolean;
  /** Présent uniquement quand NEXT_PUBLIC_DEBUG=true côté serveur. */
  debugInput?: unknown;
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
  mobility: MobilityAnalysisDto;
  risks: RiskAnalysisDto;
  realEstate: RealEstateAnalysisDto;
  airQuality: AirQualityAnalysisDto;
  neighborhood: NeighborhoodAnalysisDto;
  demographics: DemographicsAnalysisDto | null;
  cadastre: CadastreAnalysisDto;
  summary: SummaryDto;
}
