import type { AirQualityAnalysis, AirQualityData } from "../domain/air-quality.types";

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
      return {
        level: "moyen",
        message: "Données de qualité de l'air indisponibles.",
        dominantPollutant: null,
        lastUpdated: new Date().toISOString(),
        recentDays: [],
      };
    }
  }

  private analyzeAirQuality(data: AirQualityData): AirQualityAnalysis {
    let message = "";
    switch (data.level) {
      case "bon":
        message = "Aucune restriction. Activités extérieures recommandées sans précaution particulière.";
        break;
      case "moyen":
        message = "Aucune restriction pour le grand public. Les personnes très sensibles peuvent ressentir une légère gêne.";
        break;
      case "dégradé":
        message = "Personnes sensibles (asthmatiques, jeunes enfants, seniors) : limiter les efforts intenses en extérieur.";
        break;
      case "mauvais":
        message = "Limiter les efforts physiques intenses à l'extérieur, surtout pour les personnes sensibles.";
        break;
      case "très_mauvais":
        message = "Éviter les sorties prolongées et les efforts physiques en extérieur.";
        break;
    }

    return {
      level: data.level,
      message,
      dominantPollutant: dominantPollutant(data.pollutants, data.aqi),
      lastUpdated: data.lastUpdated.toISOString(),
      recentDays: data.history.map((d) => ({ date: d.date, level: d.level })),
      ...(data.debugRaw !== undefined ? { debugRaw: data.debugRaw } : {}),
    };
  }
}

/** Identifie le polluant qui « tire » l'indice global vers le haut. */
function dominantPollutant(
  pollutants: AirQualityData["pollutants"],
  globalAqi: number,
): string | null {
  // Les sous-indices Atmo sont des codes 1-7 (cf. atmo-air-quality.provider.ts).
  // Le polluant dominant est celui dont le code est ≥ au global (= max).
  const labels: Record<keyof AirQualityData["pollutants"], string> = {
    no2: "dioxyde d'azote (NO₂)",
    o3: "ozone (O₃)",
    pm10: "particules PM10",
    pm25: "particules fines PM2,5",
    so2: "dioxyde de soufre (SO₂)",
  };
  const aqiToLevel: Record<number, number> = { 25: 1, 50: 2, 75: 2, 125: 3, 175: 4, 250: 5, 350: 6, 300: 7 };
  const globalLevel = aqiToLevel[globalAqi] ?? 0;

  let bestKey: keyof AirQualityData["pollutants"] | null = null;
  let bestScore = 0;
  for (const [k, v] of Object.entries(pollutants)) {
    if (typeof v === "number" && v >= bestScore) {
      bestScore = v;
      bestKey = k as keyof AirQualityData["pollutants"];
    }
  }
  if (!bestKey || bestScore < globalLevel) return null;
  return labels[bestKey];
}

export interface AirQualityProvider {
  getAirQuality(lat: number, lon: number, codeInsee?: string): Promise<AirQualityData>;
}