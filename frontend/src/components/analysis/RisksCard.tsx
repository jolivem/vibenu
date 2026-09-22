import type { ReactNode } from "react";
import type { RiskAnalysisDto, RiskCategoryDto } from "@/types/location-analysis";
import { RISK_LEVEL_BADGES, riskExplanation, splitRisks } from "./riskLevels";

function levelBadge(level: RiskCategoryDto["level"]) {
  const c = RISK_LEVEL_BADGES[level];
  return <span className={c.className}>{c.label}</span>;
}

/** Ce qu'est le risque, sous son nom — cf. `riskExplanation` pour la règle d'affichage. */
function RiskExplanation({ risk }: { risk: RiskCategoryDto }) {
  const text = riskExplanation(risk);
  if (!text) return null;
  return <p className="risk-explain">{text}</p>;
}

export function RisksCard({
  risks,
  children,
}: {
  risks: RiskAnalysisDto;
  /** Carte thématique, rendue en fin de card et débordant jusqu'à ses bords. */
  children?: ReactNode;
}) {
  return (
    <section className="card">
      <h2>Risques naturels</h2>

      <RiskList risks={risks} />

      {children ? (
        <div className="card-map">{children}</div>
      ) : null}
    </section>
  );
}

/**
 * Les deux listes de risques, sans le cadre ni la carte : les pages commune les
 * reprennent telles quelles, avec leurs propres notes de portée.
 */
export function RiskList({ risks }: { risks: RiskAnalysisDto }) {
  const { highlighted, minor } = splitRisks(risks.categories);

  return (
    <>
      {highlighted.length > 0 && (
        <div className="risk-alert">
          {highlighted.map((risk) => (
            <div key={risk.code} className="risk-row risk-row--highlight">
              <div className="risk-row-header">
                {levelBadge(risk.level)}
                <span className="risk-name">{risk.name}</span>
              </div>
              <p className="risk-message">{risk.message}</p>
              <RiskExplanation risk={risk} />
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
              <RiskExplanation risk={risk} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
