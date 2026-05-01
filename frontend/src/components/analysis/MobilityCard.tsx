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
  const station = mobility.nearestStation;
  const stationIsClose = station && station.distanceMeters <= 1500;

  return (
    <section className="card">
      <h2>Mobilité</h2>
      {(mobility.label === "bon" || mobility.label === "très bon") && (
        <p>Niveau : {mobility.label}</p>
      )}

      {station && (
        <>
          <h3>
            {stationLabel(station.mode)}
            {!isCommune && !stationIsClose && " la plus proche"}
          </h3>
          <ul>
            <li>
              {station.name}
              {!isCommune && ` — ${formatWalkingTime(station.distanceMeters)} (${formatDistance(station.distanceMeters)})`}
            </li>
          </ul>
        </>
      )}

      {!isCommune && mobility.nearestStops.length > 0 && (
        <>
          <h3>Bus</h3>
          <ul>
            {mobility.nearestStops.map((stop) => (
              <li key={stop.id}>
                {stop.name} — {formatWalkingTime(stop.distanceMeters)} ({formatDistance(stop.distanceMeters)})
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
