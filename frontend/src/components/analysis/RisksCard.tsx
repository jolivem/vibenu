import type { ReactNode } from "react";
import type { RiskAnalysisDto, RiskCategoryDto } from "@/types/location-analysis";
import { RISK_EXPLANATIONS } from "./riskExplanations";

/**
 * « Signalé » et « Non renseigné » ne sont pas des degrés : le premier dit qu'un risque
 * concerne l'adresse sans que Géorisques le gradue, le second qu'il n'y a pas de donnée.
 * D'où deux allures distinctes des quatre pastilles de gravité — voir `.risk-badge--*`.
 */
const LEVEL_BADGES: Record<RiskCategoryDto["level"], { label: string; className: string }> = {
  élevé:   { label: "Élevé",          className: "risk-badge risk-badge--eleve" },
  modéré:  { label: "Modéré",         className: "risk-badge risk-badge--modere" },
  présent: { label: "Signalé",        className: "risk-badge risk-badge--present" },
  faible:  { label: "Faible",         className: "risk-badge risk-badge--faible" },
  inconnu: { label: "Non renseigné",  className: "risk-badge risk-badge--inconnu" },
  absent:  { label: "Absent",         className: "risk-badge risk-badge--absent" },
};

function levelBadge(level: RiskCategoryDto["level"]) {
  const c = LEVEL_BADGES[level];
  return <span className={c.className}>{c.label}</span>;
}

/**
 * Ce qu'est le risque, sous son nom.
 *
 * Rendue dès que le risque concerne le lieu — donc à tous les niveaux sauf « absent »,
 * y compris « faible » et « non renseigné ». C'est délibéré : le radon classé faible
 * n'affichait jusqu'ici qu'une pastille, et c'est précisément le risque que personne ne
 * sait lire. Un risque absent, lui, n'a rien à faire expliquer.
 */
function RiskExplanation({ risk }: { risk: RiskCategoryDto }) {
  if (risk.level === "absent") return null;
  const text = RISK_EXPLANATIONS[risk.code];
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
  // « présent » rejoint les risques mis en avant : son message porte l'avertissement que
  // la gravité n'est pas publiée, et c'est justement ce qu'il faut lire.
  const highlighted = risks.categories.filter(
    (r) => r.level === "élevé" || r.level === "modéré" || r.level === "présent",
  );
  const minor = risks.categories.filter(
    (r) => r.level === "faible" || r.level === "inconnu",
  );

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

      {children ? (
        <div className="card-map">{children}</div>
      ) : null}
    </section>
  );
}
