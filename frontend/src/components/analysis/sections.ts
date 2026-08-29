/**
 * Les 6 sections de l'écran d'analyse.
 *
 * L'ordre est un arbitrage produit (PLAN-V2.md) : la question financière d'abord,
 * le contexte territorial en dernier. Il est partagé par le sommaire, le bandeau de
 * chiffres clés et le corps de la page — d'où cette source unique.
 */

export const SECTION_ORDER = [
  "immobilier",
  "proximite",
  "deplacer",
  "environnement",
  "securite",
  "risques",
  "population",
] as const;

export type SectionId = (typeof SECTION_ORDER)[number];

export const SECTION_TITLES: Record<SectionId, string> = {
  immobilier: "Immobilier & urbanisme",
  deplacer: "Se déplacer",
  proximite: "À proximité",
  environnement: "Environnement",
  securite: "Sécurité",
  risques: "Risques",
  population: "Population",
};
