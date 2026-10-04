import type { ClimateMessages } from "@/i18n/messages/fr/analysis/climate";
import type { ClimateAnalysisDto } from "@/types/location-analysis";

/** Partagé par `ClimateCard` et la fiche PDF. */
export function climateTitle(climate: ClimateAnalysisDto, m: ClimateMessages): string {
  return m.title(climate.periodStart, climate.periodEnd);
}

/**
 * Une ligne par mesure : la station la plus proche qui la relève. Les trois peuvent
 * différer — l'ensoleillement n'est mesuré que par une station sur trente.
 */
export function climateStationLines(climate: ClimateAnalysisDto, m: ClimateMessages): string[] {
  const byMetric = climate.stationsByMetric;
  const line = (metric: Parameters<ClimateMessages["stationLine"]>[0], station?: { name: string; distanceKm: number }) =>
    station ? m.stationLine(metric, station.name, station.distanceKm) : null;
  return [
    line("temperatureC", byMetric?.temperature),
    line("precipitationMm", byMetric?.precipitation),
    line("sunshineHours", byMetric?.sunshine),
  ].filter((l): l is string => l !== null);
}
