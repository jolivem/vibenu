import { env } from "@/lib/config/env";
import type { MobilityAnalysisDto } from "@/types/location-analysis";

export function MobilityCard({ mobility }: { mobility: MobilityAnalysisDto }) {
  const bd = mobility.scoreBreakdown;

  return (
    <section className="card">
      <h2>Mobilité</h2>
      <p>Score : {mobility.score}/100</p>
      <p>Niveau : {mobility.label}</p>

      {mobility.nearestStation && (
        <>
          <h3>Gare</h3>
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

      {env.debug && (
        <details className="debug-panel">
          <summary>Détail du score</summary>
          <table>
            <thead>
              <tr><th>Critère</th><th>Détail</th><th>Points</th></tr>
            </thead>
            <tbody>
              <tr><td>Base</td><td>—</td><td>+{bd.base}</td></tr>
              <tr><td>Arrêt le plus proche</td><td>{bd.nearestStop}</td><td>+{bd.nearestStopPoints}</td></tr>
              <tr><td>Gare / station</td><td>{bd.station}</td><td>+{bd.stationPoints}</td></tr>
              <tr><td>Densité (≥3 arrêts)</td><td>{bd.density}</td><td>+{bd.densityPoints}</td></tr>
              <tr><td><strong>Total</strong></td><td></td><td><strong>{mobility.score}</strong></td></tr>
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
