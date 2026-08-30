/**
 * Les sections de l'écran d'analyse.
 *
 * L'ordre est un arbitrage produit (PLAN-V2.md) : la question financière d'abord,
 * le contexte territorial en dernier. Il est partagé par le sommaire, le bandeau de
 * chiffres clés, le corps de la page et la vitrine de la landing — d'où cette source
 * unique.
 *
 * Les identifiants sont techniques : ils servent de clés de `Record` et d'ancres `#id`
 * déjà partagées par lien. Un titre se change ici sans les toucher.
 */

export const SECTION_ORDER = [
  "immobilier",
  "proximite",
  "deplacer",
  "environnement",
  "securite",
  "risques",
  "population",
  "elections",
  // Le contexte le moins décisionnel, donc en dernier — et la section la plus lourde
  // (fond ortho + rasters historiques), donc la dernière que LazyMap monte.
  "histoire",
] as const;

export type SectionId = (typeof SECTION_ORDER)[number];

export const SECTION_TITLES: Record<SectionId, string> = {
  immobilier: "Immobilier & urbanisme",
  deplacer: "Se déplacer",
  proximite: "À proximité",
  // Deux cards y cohabitent, le climat et la qualité de l'air : « Environnement » les
  // couvrait toutes deux sans en nommer aucune.
  environnement: "Climat & qualité de l'air",
  securite: "Sécurité",
  // « Risques » seul devenait ambigu depuis l'arrivée de « Sécurité » juste au-dessus :
  // l'adjectif tranche entre aléa naturel et fait social.
  risques: "Risques naturels",
  population: "Population",
  elections: "Élections",
  histoire: "Histoire",
};
