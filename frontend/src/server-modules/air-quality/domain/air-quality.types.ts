export interface AirQualityData {
  aqi: number; // Air Quality Index (0-500)
  level: "bon" | "moyen" | "dégradé" | "mauvais" | "très_mauvais";
  pollutants: {
    pm25?: number;
    pm10?: number;
    no2?: number;
    o3?: number;
    so2?: number;
  };
  source: string;
  lastUpdated: Date;
  /** Brut renvoyé par Atmo. Présent uniquement en mode debug (NEXT_PUBLIC_DEBUG=true). */
  debugRaw?: unknown;
}

export interface AirQualityAnalysis {
  level: AirQualityData["level"];
  message: string;
  /** Brut renvoyé par Atmo. Présent uniquement en mode debug (NEXT_PUBLIC_DEBUG=true). */
  debugRaw?: unknown;
}