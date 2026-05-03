import type {
  AirQualityAnalysis,
  AirQualityData,
  AirQualityHistoryDay,
  AirQualityLevel,
  MonthlyAirQualityStats,
  MonthlyPollutantStat,
  PollutantCode,
} from "../domain/air-quality.types";

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
      monthly: aggregateMonthly(data.history),
      ...(data.debugRaw !== undefined ? { debugRaw: data.debugRaw } : {}),
    };
  }
}

const POLLUTANT_LABELS: Record<PollutantCode, string> = {
  no2: "dioxyde d'azote (NO₂)",
  o3: "ozone (O₃)",
  pm10: "particules PM10",
  pm25: "particules fines PM2,5",
  so2: "dioxyde de soufre (SO₂)",
};

const CODE_TO_LEVEL: Record<number, AirQualityLevel> = {
  1: "bon",
  2: "moyen",
  3: "dégradé",
  4: "mauvais",
  5: "très_mauvais",
  6: "très_mauvais",
  7: "très_mauvais",
};

function codeToLevel(code: number): AirQualityLevel {
  return CODE_TO_LEVEL[Math.round(code)] ?? "moyen";
}

function aggregateMonthly(history: AirQualityHistoryDay[]): MonthlyAirQualityStats | undefined {
  if (history.length === 0) return undefined;

  // Niveau global = moyenne des codes (1..7) sur les jours connus.
  const codes: number[] = history
    .map((d) => levelToCode(d.level))
    .filter((c): c is number => c !== null);
  if (codes.length === 0) return undefined;
  const meanCode = codes.reduce((s, v) => s + v, 0) / codes.length;
  const monthlyLevel = codeToLevel(meanCode);

  // Par polluant : moyenne sur les jours où un code est présent.
  const accumulator: Record<string, { sum: number; count: number }> = {};
  for (const day of history) {
    if (!day.pollutantCodes) continue;
    for (const [code, value] of Object.entries(day.pollutantCodes)) {
      if (typeof value !== "number" || value <= 0) continue;
      if (!accumulator[code]) accumulator[code] = { sum: 0, count: 0 };
      accumulator[code].sum += value;
      accumulator[code].count += 1;
    }
  }

  const pollutants: MonthlyPollutantStat[] = (Object.keys(POLLUTANT_LABELS) as PollutantCode[])
    .map((code) => {
      const acc = accumulator[code];
      if (!acc || acc.count === 0) return null;
      const mean = acc.sum / acc.count;
      return {
        code,
        label: POLLUTANT_LABELS[code],
        level: codeToLevel(mean),
        daysCovered: acc.count,
      };
    })
    .filter((p): p is MonthlyPollutantStat => p !== null)
    .sort((a, b) => levelOrder(b.level) - levelOrder(a.level));

  return {
    level: monthlyLevel,
    daysCovered: history.length,
    pollutants,
  };
}

const LEVEL_TO_CODE: Record<AirQualityLevel, number> = {
  bon: 1,
  moyen: 2,
  dégradé: 3,
  mauvais: 4,
  très_mauvais: 5,
};

function levelToCode(level: AirQualityLevel): number | null {
  return LEVEL_TO_CODE[level] ?? null;
}

function levelOrder(level: AirQualityLevel): number {
  return LEVEL_TO_CODE[level] ?? 0;
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
