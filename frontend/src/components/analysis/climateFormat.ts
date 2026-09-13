import type { ClimateAnalysisDto } from "@/types/location-analysis";

/** Partagé par `ClimateCard` et `PdfClimate`. */
export function climateTitle(climate: ClimateAnalysisDto): string {
  return `Climat (normales ${climate.periodStart}–${climate.periodEnd})`;
}

function stationLine(
  label: string,
  station?: { name: string; distanceKm: number },
): string | null {
  if (!station) return null;
  const km = station.distanceKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  return `${label} : ${station.name} (${km} km)`;
}

/** « Température : Paris-Montsouris (3,2 km) », une entrée par mesure qui a sa station. */
export function climateStationLines(climate: ClimateAnalysisDto): string[] {
  const byMetric = climate.stationsByMetric;
  return [
    stationLine("Température", byMetric?.temperature),
    stationLine("Précipitations", byMetric?.precipitation),
    stationLine("Ensoleillement", byMetric?.sunshine),
  ].filter((l): l is string => l !== null);
}
