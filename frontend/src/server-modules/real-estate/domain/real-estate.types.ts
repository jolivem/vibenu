/**
 * Période de construction, au découpage du Registre national des copropriétés. L'année des
 * Fichiers fonciers est ramenée à ce découpage quand l'immeuble n'est pas au registre.
 */
export const BUILDING_PERIODS = [
  "AVANT_1949",
  "DE_1949_A_1960",
  "DE_1961_A_1974",
  "DE_1975_A_1993",
  "DE_1994_A_2000",
  "DE_2001_A_2010",
  "APRES_2011",
] as const;
export type BuildingPeriodCode = (typeof BUILDING_PERIODS)[number];

/** Un contour de parcelle sur la carte, coloré par la médiane des ventes qu'elle porte. */
export interface DvfTransactionFeature {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties: {
    /** Clé de l'immeuble dans `RealEstateAnalysis.buildings`. */
    buildingKey: string;
    /** Médiane des €/m² des ventes de la parcelle. */
    pricePerSqm: number;
    salesCount: number;
  };
}

/** Une vente DVF. */
export interface DvfSale {
  date: string;
  propertyType: string;
  surface: number;
  price: number;
  pricePerSqm: number;
  /** Logements de la vente (un lot de deux appartements en compte deux). */
  dwellings: number | null;
}

/** Fiche de l'immeuble, tirée de la BDNB (table `bdnb_parcelle`). */
export interface BuildingInfo {
  /** Usage des Fichiers fonciers, tel quel (« Résidentiel collectif »…). */
  usage: string | null;
  dwellings: number | null;
  floors: number | null;
  periodCode: BuildingPeriodCode | null;
  /** D'où vient la période : le registre des copropriétés, ou l'année des Fichiers fonciers. */
  periodSource: "rnc" | "fichiers-fonciers" | null;
  address: string | null;
}

/** Les ventes d'une même parcelle — le plus souvent, d'un même immeuble. */
export interface DvfBuilding {
  key: string;
  /** Identifiant cadastral (« 75115000EL0044 »), absent si DVF ne le donne pas. */
  parcelId: string | null;
  distanceMeters: number;
  medianPricePerSqm: number;
  /** De la plus récente à la plus ancienne. */
  sales: DvfSale[];
  building: BuildingInfo | null;
}

/** Les deux types de bien de DVF retenus à l'import. */
export type PropertyKind = "appartement" | "maison";

/** Le marché d'un type de bien : ses ventes retenues, leur médiane et leur rayon. */
export interface PropertyKindMarket {
  count: number;
  /** `null` sous `MIN_SALES_FOR_MEDIAN` ventes : trop peu pour un prix médian. */
  medianPricePerSqm: number | null;
}

export interface RealEstateAnalysis {
  /** Ventes retenues, tous types confondus. */
  nearbyTransactionsCount?: number;
  /**
   * Une médiane par type : mélangées, elles ne décrivaient ni l'un ni l'autre (à Boën-sur-
   * Lignon, 1 031 €/m² entre des appartements à 843 et des maisons à 1 316).
   */
  markets?: Record<PropertyKind, PropertyKindMarket | null>;
  /** Millésimes DVF retenus (années civiles), en mode adresse. */
  period?: { from: number; to: number };
  /** Distance de la vente retenue la plus lointaine, en mode adresse. */
  radiusMeters?: number;
  transactionFeatures?: DvfTransactionFeature[];
  /** Triés par distance (mode adresse) ou par nombre de ventes (mode commune). */
  buildings?: DvfBuilding[];
}
