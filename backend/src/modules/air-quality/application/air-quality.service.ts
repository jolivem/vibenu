import type { AirQualityAnalysis, AirQualityData } from "../domain/air-quality.types.js";

export interface AirQualityService {
  getAirQualityData(lat: number, lon: number, codeInsee?: string): Promise<AirQualityAnalysis>;
}

export class AirQualityServiceImpl implements AirQualityService {
  constructor(private readonly airQualityProvider: AirQualityProvider) {}

  async getAirQualityData(lat: number, lon: number, codeInsee?: string): Promise<AirQualityAnalysis> {
    try {
      const data = await this.airQualityProvider.getAirQuality(lat, lon, codeInsee);
      return this.analyzeAirQuality(data);
    } catch (error) {
      console.error("Air quality service error:", error);
      // Return neutral score on error
      return {
        score: 50,
        level: "moyen",
        message: "Données de qualité de l'air indisponibles.",
      };
    }
  }

  private analyzeAirQuality(data: AirQualityData): AirQualityAnalysis {
    // Convert AQI to score (higher AQI = lower score)
    const score = Math.max(0, Math.min(100, 100 - (data.aqi / 5)));

    let message = "";
    switch (data.level) {
      case "bon":
        message = "Qualité de l'air excellente.";
        break;
      case "moyen":
        message = "Qualité de l'air acceptable.";
        break;
      case "dégradé":
        message = "Qualité de l'air dégradée, surveiller les pics de pollution.";
        break;
      case "mauvais":
        message = "Qualité de l'air mauvaise, limiter les activités extérieures.";
        break;
      case "très_mauvais":
        message = "Qualité de l'air très mauvaise, éviter les sorties.";
        break;
    }

    return {
      score: Math.round(score),
      level: data.level,
      message,
    };
  }
}

export interface AirQualityProvider {
  getAirQuality(lat: number, lon: number, codeInsee?: string): Promise<AirQualityData>;
}