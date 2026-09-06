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

import { FEATURES } from "@/lib/site-features";

export const SECTION_ORDER = [
  // Le logement et ce qu'on en atteint.
  "immobilier",
  "proximite",
  "deplacer",
  // Puis les gens : qui vit là, et comment.
  "securite",
  "population",
  "elections",
  // Puis le cadre physique, qu'on ne choisit pas.
  "environnement",
  "risques",
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
  // couvrait toutes deux sans en nommer aucune. Le titre suit donc ce que la section
  // contient réellement — annoncer la qualité de l'air quand elle est coupée serait la
  // promettre pour rien, dans le sommaire comme sur la vitrine de la landing.
  environnement: FEATURES.showAirQuality ? "Climat & qualité de l'air" : "Climat",
  securite: "Sécurité",
  // « Risques » seul serait ambigu depuis l'arrivée de « Sécurité » dans la page :
  // l'adjectif tranche entre aléa naturel et fait social.
  risques: "Risques naturels",
  population: "Population",
  elections: "Élections",
  histoire: "Histoire",
};
