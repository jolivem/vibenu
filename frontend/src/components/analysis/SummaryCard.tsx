import type { SummaryDto } from "@/types/location-analysis";

export function SummaryCard({ summary }: { summary: SummaryDto }) {
  return (
    <section className="card">
      <h2>Résumé</h2>
      <p>{summary.shortText}</p>
      <div className="summary-grid">
        <div>
          <h3>Points forts</h3>
          <ul>
            {summary.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Points à vérifier</h3>
          <ul>
            {summary.warnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
