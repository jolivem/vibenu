import type { RiskAnalysisDto, RiskCategoryDto } from "@/types/location-analysis";

function levelBadge(level: RiskCategoryDto["level"]) {
  const config = {
    élevé:  { label: "Élevé",  className: "risk-badge risk-badge--eleve" },
    modéré: { label: "Modéré", className: "risk-badge risk-badge--modere" },
    faible: { label: "Faible", className: "risk-badge risk-badge--faible" },
    absent: { label: "Absent", className: "risk-badge risk-badge--absent" },
  };
  const c = config[level];
  return <span className={c.className}>{c.label}</span>;
}

export function RisksCard({ risks }: { risks: RiskAnalysisDto }) {
  const highlighted = risks.categories.filter((r) => r.level === "élevé" || r.level === "modéré");
  const minor = risks.categories.filter((r) => r.level === "faible" || r.level === "absent");

  return (
    <section className="card">
      <h2>Risques</h2>
      <p>Niveau global : {levelBadge(risks.level)}</p>

      {highlighted.length > 0 && (
        <div className="risk-alert">
          {highlighted.map((risk) => (
            <div key={risk.code} className="risk-row risk-row--highlight">
              <div className="risk-row-header">
                {levelBadge(risk.level)}
                <span className="risk-name">{risk.name}</span>
              </div>
              <p className="risk-message">{risk.message}</p>
            </div>
          ))}
        </div>
      )}

      {minor.length > 0 && (
        <div className="risk-list">
          {minor.map((risk) => (
            <div key={risk.code} className="risk-row">
              <div className="risk-row-header">
                {levelBadge(risk.level)}
                <span className="risk-name">{risk.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
