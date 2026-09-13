import type { AnalysisMode, MobilityAnalysisDto } from "@/types/location-analysis";

function stationLabel(mode: string): string {
  switch (mode) {
    case "métro/RER": return "Métro / RER";
    case "metro": return "Métro";
    case "rer": return "RER";
    case "train": return "Gare";
    default: return "Station";
  }
}

/** Titre de section : reflète les modes présents dans la liste. */
function stationsHeading(stations: { mode: string }[]): string {
  const modes = new Set(stations.map((s) => s.mode));
  if (modes.size === 1) {
    return stationLabel(stations[0].mode);
  }
  // Mix de plusieurs modes (ex. métro + RER + train) → titre générique
  if (modes.has("train") && (modes.has("metro") || modes.has("rer") || modes.has("métro/RER"))) {
    return "Gare, métro & RER";
  }
  if (modes.has("rer") || modes.has("métro/RER")) {
    return "Métro & RER";
  }
  return "Stations";
}

/**
 * Ce que la card Transports affiche, calculé une fois pour l'écran et pour le PDF.
 *
 * En mode commune, les distances sont mesurées depuis le centroïde : elles ne disent
 * rien et sont masquées, et les listes sont écourtées (3 arrêts, 1 gare).
 */
export function mobilityView(mobility: MobilityAnalysisDto, mode: AnalysisMode) {
  const isCommune = mode === "commune";
  const allStations = mobility.nearestStations;
  const closestStation = allStations[0];
  const closestStationIsNear = closestStation && closestStation.distanceMeters <= 1500;

  return {
    isCommune,
    stops: isCommune ? mobility.nearestStops.slice(0, 3) : mobility.nearestStops,
    stations: isCommune ? allStations.slice(0, 1) : allStations,
    stationsTitle:
      allStations.length > 0
        ? `${stationsHeading(allStations)}${!isCommune && !closestStationIsNear ? " la plus proche" : ""}`
        : "",
  };
}
