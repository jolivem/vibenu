import type { ClimateService } from "./climate.service";
import type { ClimateAnalysis } from "../domain/climate.types";
import type { ClimateProvider } from "../infrastructure/climate.provider";
import { FRANCE_NORMALES } from "../domain/reference-climates";

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
      // Plus affiché par la card, qui compare désormais à 3 climats types. Conservé
      // pour le PDF, qui garde ses barres annuelles face à la moyenne France.
      national: {
        temperatureC: national?.temperatureC ?? FRANCE_NORMALES.temperatureC,
        precipitationMm: national?.precipitationMm ?? FRANCE_NORMALES.precipitationMm,
        sunshineHours: national?.sunshineHours ?? FRANCE_NORMALES.sunshineHours,
      },
      station: local.station,
      stationsByMetric: local.stationsByMetric,
      monthly: local.monthly ?? null,
    };
  }
}
