import type { RiskAnalysisDto, RiskCategoryDto } from "@/types/location-analysis";
import { RISK_EXPLANATIONS } from "./riskExplanations";

/**
 * « Signalé » et « Non renseigné » ne sont pas des degrés : le premier dit qu'un risque
 * concerne l'adresse sans que Géorisques le gradue, le second qu'il n'y a pas de donnée.
 * D'où deux allures distinctes des quatre pastilles de gravité — voir `.risk-badge--*`.
 *
 * Les couleurs recopient celles du CSS pour le PDF, qui ne lit pas la feuille de style.
 */
export const RISK_LEVEL_BADGES: Record<
  RiskCategoryDto["level"],
  { label: string; className: string; background: string; color: string; dashed?: boolean }
> = {
  élevé:   { label: "Élevé",         className: "risk-badge risk-badge--eleve",   background: "#fde8e8", color: "#991b1b" },
  modéré:  { label: "Modéré",        className: "risk-badge risk-badge--modere",  background: "#fff3cd", color: "#92400e" },
  présent: { label: "Signalé",       className: "risk-badge risk-badge--present", background: "#e6edfa", color: "#1e429f" },
  faible:  { label: "Faible",        className: "risk-badge risk-badge--faible",  background: "#e8f5e9", color: "#166534" },
  inconnu: { label: "Non renseigné", className: "risk-badge risk-badge--inconnu", background: "transparent", color: "#9ca3af", dashed: true },
  absent:  { label: "Absent",        className: "risk-badge risk-badge--absent",  background: "#f3f4f6", color: "#6b7280" },
};

/**
 * Les risques mis en avant, puis les autres. Les risques absents ne sont pas listés.
 *
 * « présent » rejoint les risques mis en avant : son message porte l'avertissement que
 * la gravité n'est pas publiée, et c'est justement ce qu'il faut lire.
 */
export function splitRisks(categories: RiskAnalysisDto["categories"]) {
  return {
    highlighted: categories.filter(
      (r) => r.level === "élevé" || r.level === "modéré" || r.level === "présent",
    ),
    minor: categories.filter((r) => r.level === "faible" || r.level === "inconnu"),
  };
}

/**
 * Ce qu'est le risque, sous son nom.
 *
 * Rendue dès que le risque concerne le lieu — donc à tous les niveaux sauf « absent »,
 * y compris « faible » et « non renseigné ». C'est délibéré : le radon classé faible
 * n'affichait jusqu'ici qu'une pastille, et c'est précisément le risque que personne ne
 * sait lire. Un risque absent, lui, n'a rien à faire expliquer.
 */
export function riskExplanation(risk: RiskCategoryDto): string | null {
  if (risk.level === "absent") return null;
  return RISK_EXPLANATIONS[risk.code] ?? null;
}
