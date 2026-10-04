/**
 * Textes communs à toutes les pages traduites. Le type de chaque dictionnaire se déduit du
 * français : le fichier anglais doit le satisfaire, une clé manquante ne compile pas.
 */
export const common = {
  loading: "Chargement...",
  unknownError: "Erreur inconnue.",
  /** Étiquette des mini-synthèses rédigées par l'IA : elle les sépare de la donnée sourcée. */
  insightTag: "En bref",
  /** Sommaire latéral des pages longues. */
  sectionNav: "Sommaire",
};

export type CommonMessages = typeof common;
