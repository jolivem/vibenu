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

/**
 * Paragraphe de synthèse rédigé par le LLM.
 *
 * `debugInput` est volontairement `unknown` ici : le contrat public n'a pas à
 * exposer la forme de `NarrativeInput`, qui est un détail du module narrative.
 * La version typée vit dans `narrative/domain/narrative.types.ts`.
 */
export interface NarrativeDto {
  paragraph: string;
  generatedAt: string;
  cached: boolean;
  /** Présent uniquement quand NEXT_PUBLIC_DEBUG=true côté serveur. */
  debugInput?: unknown;
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

/** Profil sur 12 mois d'une série. Index 0 = janvier ; `null` = mesure absente. */
export interface ClimateMonthlySeriesDto {
  name: string;
  climateType?: string;
  stationName?: string;
  temperatureC: (number | null)[];
  precipitationMm: (number | null)[];
  sunshineHours: (number | null)[];
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
  /** Moyennes France. Plus affichées par la card ; toujours reprises dans le PDF. */
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
  /** Station retenue par mesure — rayons différents, donc stations parfois différentes. */
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

/** Une liste candidate aux municipales 2026, dans le tour décisif. */
export interface MunicipalesListeDto {
  panneau: number;
  /** `null` dans 91 % des communes : l'État ne nuance que les communes d'une certaine taille. */
  nuance: string | null;
  libelle: string;
  teteDeListe: string | null;
  voix: number;
  pctExprimes: number;
  /** Score national de la nuance. `null` quand la liste n'est pas nuancée. */
  pctNational: number | null;
  siegesCm: number | null;
}

export interface MunicipalesAnalysisDto {
  /** Tour décisif : le 2 si la commune y est allée, le 1 sinon. */
  tour: 1 | 2;
  inscrits: number;
  participationPct: number;
  /** Pilote le mode d'affichage : barres colorées, ou listes sans couleur politique. */
  nuancee: boolean;
  /** Résultat de la ville entière alors que l'adresse est dans un arrondissement (PLM). */
  villeEntiere: boolean;
  listes: MunicipalesListeDto[];
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
  /** Habitants par km², sur toute la surface des IRIS du périmètre. */
  density: number | null;
  ageDistribution: AgeDistributionDto | null;
  revenuMedian: number | null;
  tauxPauvrete: number | null;
}

/**
 * Une mesure aux trois échelles de la rubrique Population.
 *
 * `iris` est le quartier consulté ; `commune` et `france` sont ses repères, agrégés
 * en rapport de sommes (jamais en moyenne de taux) et pré-calculés en base. `null`
 * signifie « donnée absente de la source à cette échelle », pas « zéro ».
 */
export interface ScopedStatsDto<T> {
  iris: T | null;
  commune: T | null;
  france: T | null;
}

/**
 * Parc de logements et statut d'occupation — INSEE, recensement 2021, maille IRIS.
 * Tous les `pct*` vont de 0 à 100, au dixième.
 */
export interface HousingStatsDto {
  logements: number | null;
  /** Dénominateur du statut d'occupation et de la répartition par nombre de pièces. */
  residencesPrincipales: number | null;
  pctProprietaires: number | null;
  /** Hors parc social : le fichier INSEE compte les HLM *dans* les locataires. */
  pctLocatairesPrives: number | null;
  pctHlm: number | null;
  pctLogesGratuitement: number | null;
  /** Rapportés au parc total, pas aux résidences principales. */
  pctVacants: number | null;
  pctResidencesSecondaires: number | null;
  /** Ne bouclent pas à 100 % : il reste les « autres logements ». */
  pctMaisons: number | null;
  pctAppartements: number | null;
  /** 1, 2, 3, 4, 5 pièces et plus. */
  pieces: (number | null)[] | null;
  /**
   * Avant 1919, 1919-45, 1946-70, 1971-90, 1991-2005, 2006-18 — rapportées aux
   * résidences principales construites avant 2019, seul périmètre que l'INSEE ventile.
   */
  epoques: (number | null)[] | null;
}

/** Emploi et qualifications — INSEE, recensement 2021, maille IRIS. */
export interface EmploymentStatsDto {
  /** Au sens du recensement (déclaratif) : pas le taux BIT, et 1 à 2 points au-dessus. */
  tauxChomage: number | null;
  tauxActivite: number | null;
  /** Actifs occupés par CSP, dans l'ordre de la nomenclature INSEE (CS1 à CS6). */
  csp: (number | null)[] | null;
  /** Bac+2 et plus, parmi les non-scolarisés de 15 ans ou plus. */
  pctDiplomesSuperieur: number | null;
  /** Sans diplôme, BEPC, CAP-BEP, Bac, Bac+2, Bac+3/4, Bac+5 et plus. */
  diplomes: (number | null)[] | null;
}

/** Ménages et familles — INSEE, recensement 2021, maille IRIS. */
export interface HouseholdsStatsDto {
  nombreMenages: number | null;
  tailleMoyenne: number | null;
  pctPersonnesSeules: number | null;
  pctCouplesSansEnfant: number | null;
  pctCouplesAvecEnfants: number | null;
  pctFamillesMonoparentales: number | null;
  /** Ménages sans famille, hors personnes seules. Complète la partition. */
  pctAutresMenages: number | null;
  /** Familles par nombre d'enfants de moins de 25 ans : 0, 1, 2, 3, 4 et plus. */
  enfantsParFamille: (number | null)[] | null;
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
  /**
   * Les trois axes ajoutés suivent la forme régulière `{ iris, commune, france }`,
   * là où les champs ci-dessus déplient le quartier à plat. L'irrégularité est
   * héritée : la forme plate est consommée telle quelle par la card, le PDF et le
   * narratif, et l'aligner coûterait leur réécriture pour rien de visible.
   */
  housing?: ScopedStatsDto<HousingStatsDto> | null;
  employment?: ScopedStatsDto<EmploymentStatsDto> | null;
  households?: ScopedStatsDto<HouseholdsStatsDto> | null;
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
  security?: SecurityAnalysisDto | null;
  municipales?: MunicipalesAnalysisDto | null;
}
