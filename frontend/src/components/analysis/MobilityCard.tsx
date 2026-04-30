import type { MobilityAnalysisDto } from "@/types/location-analysis";

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

export function MobilityCard({ mobility }: { mobility: MobilityAnalysisDto }) {
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
            {!stationIsClose && " la plus proche"}
          </h3>
          <ul>
            <li>
              {station.name} — {formatDistance(station.distanceMeters)}
            </li>
          </ul>
        </>
      )}

      {mobility.nearestStops.length > 0 && (
        <>
          <h3>Bus</h3>
          <ul>
            {mobility.nearestStops.map((stop) => (
              <li key={stop.id}>
                {stop.name} — {formatDistance(stop.distanceMeters)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
