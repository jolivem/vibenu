/** Polluants dont on lit un indicateur annuel (stations EEA). */
export type AnnualPollutantCode = "no2" | "pm25" | "pm10" | "o3";

export const ANNUAL_POLLUTANTS: AnnualPollutantCode[] = ["no2", "pm25", "pm10", "o3"];

/**
 * `ugm3` : concentration moyenne annuelle. `days` : jours de dépassement par an — l'ozone,
 * polluant de pics estivaux, dont la moyenne annuelle ne dit presque rien.
 */
export type AnnualUnit = "ugm3" | "days";

/** `who` : valeur guide OMS 2021. `euTarget` : valeur cible européenne (pas d'équivalent OMS). */
export type AnnualReferenceKind = "who" | "euTarget";

/**
 * Référence affichée par polluant. NO₂, PM2,5, PM10 : valeurs guides annuelles OMS 2021 (µg/m³).
 * Ozone : valeur cible européenne, 25 jours par an au-delà de 120 µg/m³ sur 8 h, moyenne sur
 * 3 ans — l'OMS ne fixe pas de seuil exprimé en jours.
 */
export const ANNUAL_REFERENCES: Record<AnnualPollutantCode, { value: number; kind: AnnualReferenceKind }> = {
  no2: { value: 10, kind: "who" },
  pm25: { value: 5, kind: "who" },
  pm10: { value: 15, kind: "who" },
  o3: { value: 25, kind: "euTarget" },
};

export type StationArea = "urban" | "suburban" | "rural";

/** Indicateur annuel d'un polluant à la station de fond la plus proche. */
export interface AnnualPollutantStat {
  code: AnnualPollutantCode;
  value: number;
  unit: AnnualUnit;
  year: number;
  stationName: string;
  distanceKm: number;
  area: StationArea;
  /** `true` quand aucune station n'est à < 20 km et qu'on retient une station rurale de référence. */
  ruralFallback: boolean;
  /** Moyenne des stations de fond françaises la même année, même unité. */
  nationalMean: number;
  /** Seuil de référence (cf. `ANNUAL_REFERENCES`), même unité. */
  reference: number;
  referenceKind: AnnualReferenceKind;
  /** Série annuelle de la station retenue et moyenne France, alignées sur `years`. */
  history: { years: number[]; station: (number | null)[]; national: (number | null)[] };
}

export interface AirQualityAnalysis {
  /** `false` quand aucune station de mesure n'est assez proche : l'UI masque alors la card. */
  available: boolean;
  /** Indicateurs annuels par polluant ; vide si aucune station retenue. */
  annual: AnnualPollutantStat[];
}
