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
}

export interface AirQualityAnalysis {
  score: number; // 0-100, higher is better air quality
  level: AirQualityData["level"];
  message: string;
}