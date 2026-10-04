import type { StationsKind } from "@/i18n/messages/fr/analysis/mobility";
import type { AnalysisMode, MobilityAnalysisDto } from "@/types/location-analysis";

function stationKind(mode: string): StationsKind {
  switch (mode) {
    case "métro/RER": return "metroRer";
    case "metro": return "metro";
    case "rer": return "rer";
    case "train": return "train";
    default: return "station";
  }
}

/** Ce que regroupe la liste : un seul mode, ou le mélange le plus parlant. */
function stationsKind(stations: { mode: string }[]): StationsKind {
  const modes = new Set(stations.map((s) => s.mode));
  if (modes.size === 1) return stationKind(stations[0].mode);
  if (modes.has("train") && (modes.has("metro") || modes.has("rer") || modes.has("métro/RER"))) {
    return "trainMetroRer";
  }
  if (modes.has("rer") || modes.has("métro/RER")) return "metroAndRer";
  return "stations";
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
    /** `null` sans gare ni station. Le titre du bloc se compose avec `m.stationsTitle`. */
    stationsHeading:
      allStations.length > 0
        ? { kind: stationsKind(allStations), nearestOnly: !isCommune && !closestStationIsNear }
        : null,
  };
}
