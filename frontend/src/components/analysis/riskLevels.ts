import type { RiskAnalysisDto, RiskCategoryDto } from "@/types/location-analysis";
import type { RisksMessages } from "@/i18n/messages/fr/analysis/risks";

/**
 * « Signalé » et « Non renseigné » ne sont pas des degrés : le premier dit qu'un risque
 * concerne l'adresse sans que Géorisques le gradue, le second qu'il n'y a pas de donnée.
 * D'où deux allures distinctes des quatre pastilles de gravité — voir `.risk-badge--*`.
 *
 * Les couleurs recopient celles du CSS pour le PDF, qui ne lit pas la feuille de style.
 */
export const RISK_LEVEL_BADGES: Record<
  RiskCategoryDto["level"],
  { className: string; background: string; color: string; dashed?: boolean }
> = {
  élevé:   { className: "risk-badge risk-badge--eleve",   background: "#fde8e8", color: "#991b1b" },
  modéré:  { className: "risk-badge risk-badge--modere",  background: "#fff3cd", color: "#92400e" },
  présent: { className: "risk-badge risk-badge--present", background: "#e6edfa", color: "#1e429f" },
  faible:  { className: "risk-badge risk-badge--faible",  background: "#e8f5e9", color: "#166534" },
  inconnu: { className: "risk-badge risk-badge--inconnu", background: "transparent", color: "#9ca3af", dashed: true },
  absent:  { className: "risk-badge risk-badge--absent",  background: "#f3f4f6", color: "#6b7280" },
};

/**
 * Les risques mis en avant, puis les autres. Les risques absents ne sont pas listés.
 *
 * « présent » rejoint les risques mis en avant : son message porte l'avertissement que
 * la gravité n'est pas publiée, et c'est justement ce qu'il faut lire.
 */
function isCommuneSevere(r: RiskAnalysisDto["categories"][number]): boolean {
  return r.level === "inconnu" && (r.communeLevel === "élevé" || r.communeLevel === "modéré");
}

export function splitRisks(categories: RiskAnalysisDto["categories"]) {
  return {
    // Un risque inconnu à l'adresse mais élevé ou modéré sur la commune reste en tête : il ne
    // doit pas disparaître parmi les « autres » parce que Géorisques ne le situe pas au point.
    highlighted: categories.filter(
      (r) => r.level === "élevé" || r.level === "modéré" || r.level === "présent" || isCommuneSevere(r),
    ),
    minor: categories.filter((r) => (r.level === "faible" || r.level === "inconnu") && !isCommuneSevere(r)),
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
export function riskExplanation(risk: RiskCategoryDto, m: RisksMessages): string | null {
  if (risk.level === "absent") return null;
  return m.explanations[risk.code] ?? null;
}

/** Libellé de la pastille : « Indisponible » quand la source n'a pas répondu, sinon le niveau. */
export function riskBadgeLabel(risk: RiskCategoryDto, m: RisksMessages): string {
  return risk.unavailable ? m.unavailableBadge : m.levels[risk.level];
}

/** Nom du risque dans la langue de la page ; à défaut, celui que le serveur envoie. */
export function riskName(risk: RiskCategoryDto, m: RisksMessages): string {
  return m.names[risk.code] ?? risk.name;
}

/** Message du risque, recomposé à partir des faits du DTO. */
export function riskMessage(risk: RiskCategoryDto, m: RisksMessages): string {
  return m.message({
    name: riskName(risk, m),
    level: risk.level,
    detail: risk.statusDetail ?? null,
    communeFallback: Boolean(risk.communeFallback),
    communeLevel: risk.communeLevel ? m.levels[risk.communeLevel] : null,
    unavailable: Boolean(risk.unavailable),
  });
}
