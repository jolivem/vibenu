import type { ReactNode } from "react";
import type { RiskAnalysisDto, RiskCategoryDto } from "@/types/location-analysis";
import type { RisksMessages } from "@/i18n/messages/fr/analysis/risks";
import { RISK_LEVEL_BADGES, riskExplanation, riskMessage, riskName, splitRisks } from "./riskLevels";
import { CardDetail } from "./readingMode";

function levelBadge(level: RiskCategoryDto["level"], m: RisksMessages) {
  return <span className={RISK_LEVEL_BADGES[level].className}>{m.levels[level]}</span>;
}

/** Ce qu'est le risque, sous son nom — cf. `riskExplanation` pour la règle d'affichage. */
function RiskExplanation({ risk, m }: { risk: RiskCategoryDto; m: RisksMessages }) {
  const text = riskExplanation(risk, m);
  if (!text) return null;
  return <p className="risk-explain">{text}</p>;
}

/**
 * Risques naturels du lieu, avec la carte des aléas.
 *
 * En mode « L'essentiel », les risques mis en avant (élevé, modéré, signalé) ; les risques
 * faibles ou non renseignés et la carte passent dans le détail.
 */
export function RisksCard({
  risks,
  m,
  children,
}: {
  risks: RiskAnalysisDto;
  m: RisksMessages;
  /** Carte thématique, rendue en fin de card et débordant jusqu'à ses bords. */
  children?: ReactNode;
}) {
  return (
    <section className="card">
      <h2>{m.title}</h2>

      <RiskList risks={risks} m={m} only="highlighted" />
      {splitRisks(risks.categories).highlighted.length === 0 && <p className="risk-none">{m.noHighlighted}</p>}

      <CardDetail>
        <RiskList risks={risks} m={m} only="minor" />

        {children ? (
          <div className="card-map">{children}</div>
        ) : null}
      </CardDetail>
    </section>
  );
}

/**
 * Les deux listes de risques, sans le cadre ni la carte : les pages commune les
 * reprennent telles quelles, avec leurs propres notes de portée.
 */
export function RiskList({
  risks,
  m,
  only,
}: {
  risks: RiskAnalysisDto;
  m: RisksMessages;
  /** Une seule des deux listes : l'écran d'analyse met la seconde dans le détail. */
  only?: "highlighted" | "minor";
}) {
  const { highlighted, minor } = splitRisks(risks.categories);

  return (
    <>
      {only !== "minor" && highlighted.length > 0 && (
        <div className="risk-alert">
          {highlighted.map((risk) => (
            <div key={risk.code} className="risk-row risk-row--highlight">
              <div className="risk-row-header">
                {levelBadge(risk.level, m)}
                <span className="risk-name">{riskName(risk, m)}</span>
              </div>
              <p className="risk-message">{riskMessage(risk, m)}</p>
              <RiskExplanation risk={risk} m={m} />
            </div>
          ))}
        </div>
      )}

      {only !== "highlighted" && minor.length > 0 && (
        <div className="risk-list">
          {minor.map((risk) => (
            <div key={risk.code} className="risk-row">
              <div className="risk-row-header">
                {levelBadge(risk.level, m)}
                <span className="risk-name">{riskName(risk, m)}</span>
              </div>
              <RiskExplanation risk={risk} m={m} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
