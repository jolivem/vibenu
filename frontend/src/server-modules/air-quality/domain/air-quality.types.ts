export type AirQualityLevel = "bon" | "moyen" | "dégradé" | "mauvais" | "très_mauvais";

export type PollutantCode = "no2" | "o3" | "pm10" | "pm25" | "so2";

export interface AirQualityHistoryDay {
  date: string; // ISO YYYY-MM-DD
  level: AirQualityLevel;
  aqi: number;
  /** Codes Atmo 0-7 par sous-polluant pour ce jour (optionnel selon disponibilité). */
  pollutantCodes?: Partial<Record<PollutantCode, number>>;
}

export interface MonthlyPollutantStat {
  code: PollutantCode;
  /** Libellé long affichable, ex. "ozone (O₃)". */
  label: string;
  /** Niveau moyen sur la période. */
  level: AirQualityLevel;
  /** Nombre de jours avec donnée. */
  daysCovered: number;
}

export interface MonthlyAirQualityStats {
  level: AirQualityLevel;
  daysCovered: number;
  pollutants: MonthlyPollutantStat[];
}

export interface AirQualityData {
  aqi: number; // Air Quality Index (0-500), valeur du jour
  level: AirQualityLevel; // niveau du jour
  pollutants: {
    pm25?: number;
    pm10?: number;
    no2?: number;
    o3?: number;
    so2?: number;
  };
  source: string;
  lastUpdated: Date;
  /** Historique récent (du plus ancien au plus récent), incluant le jour courant. */
  history: AirQualityHistoryDay[];
  /** Brut renvoyé par Atmo. Présent uniquement en mode debug (NEXT_PUBLIC_DEBUG=true). */
  debugRaw?: unknown;
}

export interface AirQualityRecentDay {
  date: string;
  level: AirQualityLevel;
}

export interface AirQualityAnalysis {
  /** `false` quand Atmo a répondu mais n'a aucun indice publié pour la commune
   *  (typiquement petites communes hors zones urbaines couvertes). L'UI masque la card
   *  dans ce cas pour éviter d'afficher un badge "moyen" trompeur basé sur le fallback. */
  available: boolean;
  level: AirQualityData["level"];
  message: string;
  /** Polluant le plus contributeur à l'indice (ex. "ozone (O₃)"). null si non identifiable. */
  dominantPollutant: string | null;
  /** ISO date de la dernière mise à jour Atmo. */
  lastUpdated: string;
  /** Historique récent (typiquement 7 jours, du plus ancien au plus récent). */
  recentDays: AirQualityRecentDay[];
  /** Statistiques agrégées sur ~30 jours. */
  monthly?: MonthlyAirQualityStats;
  /** Brut renvoyé par Atmo. Présent uniquement en mode debug (NEXT_PUBLIC_DEBUG=true). */
  debugRaw?: unknown;
}