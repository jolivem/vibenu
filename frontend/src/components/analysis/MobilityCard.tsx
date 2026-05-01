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

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

// Vitesse de marche moyenne ≈ 4,5 km/h (75 m/min)
function formatWalkingTime(meters: number): string {
  const minutes = Math.max(1, Math.round(meters / 75));
  if (minutes < 60) return `${minutes} min à pied`;
  const h = Math.floor(minutes / 60);
  const m = Math.round((minutes - h * 60) / 5) * 5;
  return m === 0 ? `${h} h à pied` : `${h} h ${String(m).padStart(2, "0")} à pied`;
}

interface Props {
  mobility: MobilityAnalysisDto;
  /** Mode d'analyse — en "commune", on masque distances/temps (mesurés depuis le centroïde). */
  mode: AnalysisMode;
}

export function MobilityCard({ mobility, mode }: Props) {
  const isCommune = mode === "commune";
  const stations = mobility.nearestStations;
  const closestStation = stations[0];
  const closestStationIsNear = closestStation && closestStation.distanceMeters <= 1500;

  return (
    <section className="card">
      <h2>Mobilité</h2>
      {(mobility.label === "bon" || mobility.label === "très bon") && (
        <p>Niveau : {mobility.label}</p>
      )}

      {!isCommune && mobility.nearestStops.length > 0 && (
        <>
          <h3>Bus</h3>
          <ul>
            {mobility.nearestStops.map((stop) => (
              <li key={stop.id}>
                {stop.name} — {formatWalkingTime(stop.distanceMeters)}{" "}
                <span className="poi-distance">({formatDistance(stop.distanceMeters)})</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {stations.length > 0 && (
        <>
          <h3>
            {stationsHeading(stations)}
            {!isCommune && !closestStationIsNear && " la plus proche"}
          </h3>
          <ul>
            {(isCommune ? stations.slice(0, 1) : stations).map((s) => (
              <li key={s.id}>
                {s.name}
                {!isCommune && (
                  <>
                    {" "}— {formatWalkingTime(s.distanceMeters)}{" "}
                    <span className="poi-distance">({formatDistance(s.distanceMeters)})</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
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
