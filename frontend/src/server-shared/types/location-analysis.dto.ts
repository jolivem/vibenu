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
  mode: string; // "train", "métro/RER", "rer", "metro", ...
}

export interface MobilityAnalysisDto {
  nearestStops: TransportStopDto[];
  /** Gares/métros/RER les plus proches, triés par distance (max 5). */
  nearestStations: StationDto[];
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

export type AirQualityLevel = "bon" | "moyen" | "dégradé" | "mauvais" | "très_mauvais";

export interface AirQualityDayDto {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  level: AirQualityLevel;
}

export interface MonthlyPollutantDto {
  code: "no2" | "o3" | "pm10" | "pm25" | "so2";
  label: string;
  level: AirQualityLevel;
  daysCovered: number;
}

export interface MonthlyAirQualityDto {
  level: AirQualityLevel;
  daysCovered: number;
  pollutants: MonthlyPollutantDto[];
}

export interface AirQualityAnalysisDto {
  level: AirQualityLevel;
  message: string;
  /** Polluant le plus contributeur à l'indice (ex. "ozone (O₃)"). */
  dominantPollutant: string | null;
  /** Date ISO de la dernière mise à jour Atmo. */
  lastUpdated: string;
  /** Historique récent (typiquement 7 jours, du plus ancien au plus récent). */
  recentDays: AirQualityDayDto[];
  /** Statistiques agrégées sur ~30 jours. */
  monthly?: MonthlyAirQualityDto;
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

export interface ClimateAnalysisDto {
  periodStart: number;
  periodEnd: number;
  /** Température annuelle moyenne (°C). Peut être null si la station ne fournit pas T. */
  temperatureC: number | null;
  /** Cumul annuel moyen de précipitations (mm). Peut être null. */
  precipitationMm: number | null;
  /** Cumul annuel moyen d'ensoleillement (h). Souvent null (stations héliographes rares). */
  sunshineHours: number | null;
  national: {
    temperatureC: number;
    precipitationMm: number;
    sunshineHours: number;
  };
  /** Station Météo-France de référence (mode adresse). */
  station?: {
    name: string;
    distanceKm: number;
  };
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

export interface SchoolSectorDto {
  niveau: "college" | "lycee";
  territoire: string;
  codeUai: string | null;
  nomEtablissement: string;
  adresse: string | null;
  geometry: GeoJsonGeometryDto;
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

/**
 * Mode d'analyse :
 *  - "address" : recherche par adresse précise (housenumber, street, locality)
 *  - "commune" : recherche par nom de commune (municipality)
 *
 * Détermine le comportement de plusieurs services (DVF en commune entière vs rayon,
 * affichage du contour communal sur la carte, masquage des distances de mobilité, etc.).
 */
export type AnalysisMode = "address" | "commune";

export interface LocationAnalysisDto {
  mode: AnalysisMode;
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
  climate?: ClimateAnalysisDto | null;
  schoolSector?: SchoolSectorDto | null;
}
