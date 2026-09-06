import type { CommuneStats } from "../../commune-stats/domain/commune-stats.types";

export interface CommuneNarrativeInput {
  codeCommune: string;
  nomAffiche: string;
  stats: CommuneStats;
}

/**
 * Légendes de lecture des graphiques, une par section chiffrée de la page.
 *
 * Elles sont produites par le MÊME appel que le texte éditorial ci-dessous, et non par
 * une seconde requête : le modèle rédige les légendes en ayant déjà ses propres
 * paragraphes en contexte, ce qui évite mécaniquement la redite — un second appel, lui,
 * ne saurait pas ce que le premier a écrit.
 */
export const COMMUNE_LEGEND_KEYS = [
  "legende_prix",
  "legende_demographie",
  "legende_equipements",
  "legende_air",
  "legende_elections",
] as const;

export type CommuneLegendKey = (typeof COMMUNE_LEGEND_KEYS)[number];

export type CommuneLegendes = Partial<Record<CommuneLegendKey, string>>;

export interface CommuneNarrativeContent {
  // Texte éditorial. Obligatoire : c'est le contenu unique de la page, donc sa valeur
  // de référencement. Une clé manquante invalide toute la narrative.
  identite: string;
  marche_immobilier: string;
  cadre_de_vie: string;
  profil: string;
  /**
   * Légendes de graphes. Optionnelles et validées une à une : une légende ratée doit
   * coûter une phrase, jamais les quatre paragraphes éditoriaux.
   */
  legendes: CommuneLegendes;
}

export interface CommuneNarrativeResult {
  content: CommuneNarrativeContent;
  model: string;
  generatedAt: string; // ISO
  fromCache: boolean;
}
