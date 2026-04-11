import type { ScoreBreakdownDto } from "@/types/location-analysis";

export function ScoreCard({ scores }: { scores: ScoreBreakdownDto }) {
  return (
    <section className="card score-card">
      <h2>Score global</h2>
      <p className="score-value">{scores.globalScore}/100</p>
      <ul>
        <li>Mobilité : {scores.mobilityScore}</li>
        <li>Risques : {scores.riskScore}</li>
        <li>Immobilier : {scores.realEstateScore}</li>
        <li>Environnement : {scores.environmentScore}</li>
      </ul>
    </section>
  );
}
