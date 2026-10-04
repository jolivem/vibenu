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

import type { SectionsMessages } from "@/i18n/messages/fr/analysis/sections";

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

/** Titres des sections dans une langue ; « environnement » suit la card de qualité de l'air. */
export function sectionTitles(m: SectionsMessages, showAirQuality: boolean): Record<SectionId, string> {
  return {
    ...m.titles,
    environnement: showAirQuality ? m.environnementWithAirQuality : m.titles.environnement,
  };
}
