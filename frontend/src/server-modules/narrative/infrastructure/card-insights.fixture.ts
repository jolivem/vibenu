import type { CardInsights } from "@/server-shared/types/card-insights";

/**
 * Jeu de synthèses factices, activé par CARD_INSIGHTS_FIXTURE.
 *
 * Il existe pour une raison simple : le rendu doit pouvoir être jugé sans appeler le
 * fournisseur — quota épuisé, travail hors ligne, ou simple envie de ne pas payer sept
 * phrases à chaque rechargement. Le dépôt n'ayant aucun test, c'est aussi le seul
 * harnais de non-régression visuelle de la fonctionnalité.
 *
 * Deux choix délibérés :
 *  - "climat" est volontairement longue, pour éprouver le retour à la ligne dans la
 *    card comme dans le PDF ;
 *  - "menages" est volontairement ABSENTE, pour que le chemin « card rendue sans
 *    synthèse » soit visible à chaque essai plutôt que découvert en production.
 */
export const CARD_INSIGHTS_FIXTURE: CardInsights = {
  securite: "Les vols sans violence sont l'atteinte la plus fréquente, à un niveau supérieur à la moyenne du département, mais en baisse d'environ un tiers sur dix ans.",
  demographie: "La population est nettement plus jeune que la moyenne française, avec une forte présence des 15-29 ans. Le revenu médian se situe un peu en dessous du niveau national.",
  logement: "Le parc est presque exclusivement collectif et majoritairement locatif, à l'inverse du profil national. Les logements de deux pièces dominent, dans des immeubles construits pour l'essentiel avant 1946.",
  emploi: "Les cadres et professions intellectuelles forment la catégorie la plus représentée, et la part de diplômés du supérieur dépasse de plus de quinze points la moyenne française. Le chômage reste proche du niveau national.",
  elections: "La participation a dépassé de trois points la moyenne nationale. Le vote s'est porté nettement plus à gauche qu'en France, l'écart le plus marqué atteignant une quinzaine de points.",
  climat: "Le climat est proche de celui de Rennes : des hivers doux, un mois de juillet qui culmine autour de 19 °C et une amplitude annuelle modérée. Les précipitations, réparties sur toute l'année, sont un peu supérieures à celles des villes de référence les plus sèches, avec un maximum en novembre et un minimum estival marqué.",
};
