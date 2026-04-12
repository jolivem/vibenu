import type { RiskAnalysisDto } from "@/types/location-analysis";

export function RisksCard({ risks }: { risks: RiskAnalysisDto }) {
  return (
    <section className="card">
      <h2>Risques</h2>
      <p>Niveau global : {risks.level}</p>
      <ul>
        {risks.categories.map((risk) => (
          <li key={risk.code}>
            <strong>{risk.name}</strong> - {risk.level} - {risk.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
