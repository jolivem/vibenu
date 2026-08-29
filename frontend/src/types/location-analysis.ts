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
  mode: string;
}

export interface MobilityAnalysisDto {
  nearestStops: TransportStopDto[];
  /** Gares/métros/RER les plus proches, triés par distance (max 5). */
  nearestStations: StationDto[];
  label: "faible" | "correct" | "bon" | "très bon" | "excellent";
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
  /** `false` quand Atmo a répondu mais n'a aucun indice publié pour la commune.
   *  L'UI masque la card pour éviter d'afficher un fallback "moyen" trompeur. */
  available: boolean;
  level: AirQualityLevel;
  message: string;
  /** Polluant le plus contributeur à l'indice (ex. "ozone (O₃)"). */
  dominantPollutant: string | null;
  /** Date ISO de la dernière mise à jour Atmo. */
  lastUpdated: string;
  /** Historique récent (typiquement 7 jours, du plus ancien au plus récent). */
  recentDays: AirQualityDayDto[];
  /** Statistiques agrégées sur ~30 jours (qualité moyenne + polluants observés). */
  monthly?: MonthlyAirQualityDto;
  /** Présent uniquement quand NEXT_PUBLIC_DEBUG=true. */
  debugRaw?: unknown;
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

export interface SchoolSectorDto {
  niveau: "college" | "lycee";
  territoire: string;
  codeUai: string | null;
  nomEtablissement: string;
  adresse: string | null;
  geometry: GeoJsonGeometryDto;
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

/** Profil sur 12 mois d'une série. Index 0 = janvier ; `null` = mesure absente. */
export interface ClimateMonthlySeriesDto {
  name: string;
  /** Type de climat, pour les villes de référence. Absent pour la série locale. */
  climateType?: string;
  /** Station réellement utilisée, quand elle diffère du nom affiché. */
  stationName?: string;
  temperatureC: (number | null)[];
  precipitationMm: (number | null)[];
  sunshineHours: (number | null)[];
}

export interface ClimateAnalysisDto {
  periodStart: number;
  periodEnd: number;
  /** Peut être null si la station de référence ne fournit pas cette mesure. */
  temperatureC: number | null;
  precipitationMm: number | null;
  /** Souvent null : peu de stations héliographes en France. */
  sunshineHours: number | null;
  /** Moyennes France. Plus affichées par la card ; toujours reprises dans le PDF. */
  national: {
    temperatureC: number;
    precipitationMm: number;
    sunshineHours: number;
  };
  /** Station Météo-France de référence (mode adresse uniquement). */
  station?: {
    name: string;
    distanceKm: number;
  };
  /**
   * Station retenue par mesure. Les trois peuvent différer : 30 km de rayon pour la
   * température et les précipitations, 100 km pour l'ensoleillement.
   */
  stationsByMetric?: {
    temperature?: { name: string; distanceKm: number };
    precipitation?: { name: string; distanceKm: number };
    sunshine?: { name: string; distanceKm: number };
  };
  /** Profil mensuel local, comparé à trois villes de climats types. */
  monthly?: {
    local: ClimateMonthlySeriesDto;
    references: ClimateMonthlySeriesDto[];
  } | null;
}

/** Une mesure de délinquance suivie sur 10 ans, avec ses repères département et France. */
export interface SecurityIndicatorDto {
  indicateur: string;
  /** Dénominateur du taux : cambriolages par logement, le reste par habitant. */
  base: "habitants" | "logements";
  /**
   * Taux communal par année, index 0 = première année. `null` = valeur masquée par le
   * secret statistique, ce qui signifie 1 à 4 faits — l'encadrement est alors donné par
   * `borneBasse` / `borneHaute`, et l'écran le rend en bande d'incertitude.
   */
  commune: (number | null)[];
  borneBasse: (number | null)[];
  borneHaute: (number | null)[];
  departement: (number | null)[];
  france: (number | null)[];
}

export interface SecurityAnalysisDto {
  annees: number[];
  codeDepartement: string;
  indicateurs: SecurityIndicatorDto[];
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

export interface NarrativeDto {
  paragraph: string;
  generatedAt: string;
  cached: boolean;
  /** Présent uniquement quand NEXT_PUBLIC_DEBUG=true côté serveur. */
  debugInput?: unknown;
}

/**
 * Mode d'analyse — voir `AnalysisMode` côté serveur.
 *  - "address" : adresse précise
 *  - "commune" : commune entière
 */
export type AnalysisMode = "address" | "commune";

export interface LocationAnalysisDto {
  mode: AnalysisMode;
  address: SelectedAddressDto;
  map: {
    center: {
      lat: number;
      lon: number;
    };
    zoom: number;
    /** Contour de la commune si l'analyse a été lancée sur un nom de commune (type=municipality). */
    communeContour?: GeoJsonGeometryDto;
  };
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
  security?: SecurityAnalysisDto | null;
}
