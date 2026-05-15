import type { ClimateService } from "./climate.service";
import type { ClimateAnalysis } from "../domain/climate.types";
import type { ClimateProvider } from "../infrastructure/climate.provider";

/**
 * Normales France métropolitaine 1991-2020 — valeurs officielles Météo-France.
 * Source : https://meteofrance.com/climat — moyennes spatiales homogénéisées
 * sur tout le territoire (référence WMO). Utilisées comme référence nationale
 * absolue, et comme fallback si le provider runtime est indisponible.
 */
const FRANCE_NORMALES_OFFICIAL = {
  temperatureC: 13.0,
  precipitationMm: 935,
  sunshineHours: 1969,
} as const;

const PERIOD_START = 1991;
const PERIOD_END = 2020;

export class ClimateServiceImpl implements ClimateService {
  constructor(private readonly provider: ClimateProvider) {}

  async getClimateData(lat: number, lon: number): Promise<ClimateAnalysis | null> {
    // local et national en parallèle (le national peut être hardcodé → instantané)
    const [local, national] = await Promise.all([
      this.provider.getNormales(lat, lon),
      this.provider.getNationalNormales(),
    ]);

    // Si aucune station de référence à <30 km → section climat masquée.
    if (!local) return null;

    return {
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      temperatureC: local.temperatureC,
      precipitationMm: local.precipitationMm,
      sunshineHours: local.sunshineHours,
      national: {
        temperatureC: national?.temperatureC ?? FRANCE_NORMALES_OFFICIAL.temperatureC,
        precipitationMm: national?.precipitationMm ?? FRANCE_NORMALES_OFFICIAL.precipitationMm,
        sunshineHours: national?.sunshineHours ?? FRANCE_NORMALES_OFFICIAL.sunshineHours,
      },
      station: local.station,
    };
  }
}
