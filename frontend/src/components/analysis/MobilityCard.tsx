import type { MobilityAnalysisDto } from "@/types/location-analysis";

export function MobilityCard({ mobility }: { mobility: MobilityAnalysisDto }) {
  return (
    <section className="card">
      <h2>Mobilité</h2>
      <p>Score : {mobility.score}/100</p>
      <p>Niveau : {mobility.label}</p>
      <ul>
        {mobility.nearestStops.map((stop) => (
          <li key={stop.id}>
            {stop.name} - {stop.distanceMeters} m - {stop.mode}
          </li>
        ))}
      </ul>
      {mobility.nearestStation && <p>Gare proche : {mobility.nearestStation.name}</p>}
    </section>
  );
}
