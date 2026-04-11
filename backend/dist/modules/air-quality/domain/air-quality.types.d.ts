export interface AirQualityData {
    aqi: number;
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
    score: number;
    level: AirQualityData["level"];
    message: string;
}
