export type AirQualityLevel = "bon" | "moyen" | "dégradé" | "mauvais" | "très_mauvais";

export interface AirQualityHistoryDay {
  date: string; // ISO YYYY-MM-DD
  level: AirQualityLevel;
  aqi: number;
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
  level: AirQualityData["level"];
  message: string;
  /** Polluant le plus contributeur à l'indice (ex. "ozone (O₃)"). null si non identifiable. */
  dominantPollutant: string | null;
  /** ISO date de la dernière mise à jour Atmo. */
  lastUpdated: string;
  /** Historique récent (typiquement 7 jours, du plus ancien au plus récent). */
  recentDays: AirQualityRecentDay[];
  /** Brut renvoyé par Atmo. Présent uniquement en mode debug (NEXT_PUBLIC_DEBUG=true). */
  debugRaw?: unknown;
}