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

export function MobilityCard({ mobility }: { mobility: MobilityAnalysisDto }) {
  return (
    <section className="card">
      <h2>Mobilité</h2>
      <p>Niveau : {mobility.label}</p>

      {mobility.nearestStation && (
        <>
          <h3>{stationLabel(mobility.nearestStation.mode)}</h3>
          <ul>
            <li>
              {mobility.nearestStation.name} - {mobility.nearestStation.distanceMeters} m
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
                {stop.name} - {stop.distanceMeters} m
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
