import type { ClimateService } from "./climate.service";
import type { ClimateAnalysis } from "../domain/climate.types";
import type { ClimateProvider } from "../infrastructure/climate.provider";

/**
 * Normales 1991-2020 — France métropolitaine.
 * Source : Météo-France (https://meteofrance.com/climat) — moyennes spatiales
 * homogénéisées sur tout le territoire métropolitain (référence WMO actuelle).
 *
 * À mettre à jour vers 2031 (nouvelle période de référence WMO 2001-2030).
 */
const FRANCE_NORMALES = {
  temperatureC: 13.0,
  precipitationMm: 935,
  sunshineHours: 1969,
} as const;

const PERIOD_START = 1991;
const PERIOD_END = 2020;

export class ClimateServiceImpl implements ClimateService {
  constructor(private readonly provider: ClimateProvider) {}

  async getClimateData(lat: number, lon: number): Promise<ClimateAnalysis | null> {
    const local = await this.provider.getNormales(lat, lon);
    if (!local) return null;

    return {
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      temperatureC: local.temperatureC,
      precipitationMm: local.precipitationMm,
      sunshineHours: local.sunshineHours,
      national: FRANCE_NORMALES,
    };
  }
}
