import type { ReactNode } from "react";
import type { RiskAnalysisDto, RiskCategoryDto } from "@/types/location-analysis";
import type { RisksMessages } from "@/i18n/messages/fr/analysis/risks";
import { RISK_LEVEL_BADGES, catnatLines, riskBadgeLabel, riskExplanation, riskMessage, riskName, splitRisks } from "./riskLevels";
import { CardDetail } from "./readingMode";

function levelBadge(risk: RiskCategoryDto, m: RisksMessages) {
  return <span className={RISK_LEVEL_BADGES[risk.level].className}>{riskBadgeLabel(risk, m)}</span>;
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

      <CatnatHistory risks={risks} m={m} />

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
 * Les catastrophes naturelles reconnues sur la commune (GASPAR). Placées dans l'essentiel :
 * « 22 sécheresses reconnues » se lit avec la pastille des argiles, et l'état des risques
 * remis à l'acheteur les mentionne aussi.
 */
function CatnatHistory({ risks, m }: { risks: RiskAnalysisDto; m: RisksMessages }) {
  const lines = catnatLines(risks, m);
  if (!lines) return null;
  return (
    <div className="risk-catnat">
      <h3>{m.catnat.title}</h3>
      <p>{lines.summary}</p>
      {lines.perils.length > 0 && (
        <ul>
          {lines.perils.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <p className="risk-explain">{lines.source}</p>
    </div>
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
                {levelBadge(risk, m)}
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
                {levelBadge(risk, m)}
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
