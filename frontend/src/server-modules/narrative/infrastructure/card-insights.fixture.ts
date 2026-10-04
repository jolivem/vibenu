import type { Locale } from "@/i18n/locales";
import type { CardInsights, SecurityRating } from "@/server-shared/types/card-insights";

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
export const CARD_INSIGHTS_FIXTURE: Record<Locale, CardInsights> = {
  fr: {
    fiscalite: "Le taux de taxe foncière est nettement en dessous du taux médian des communes de France, malgré une hausse de près de trois points depuis 2021. La commune applique la majoration maximale sur les résidences secondaires.",
    securite: "Les vols sans violence sont l'atteinte la plus fréquente, à un niveau supérieur à la moyenne du département, mais en baisse d'environ un tiers sur dix ans.",
    demographie: "La population est nettement plus jeune que la moyenne française, avec une forte présence des 15-29 ans. Le revenu médian se situe un peu en dessous du niveau national.",
    logement: "Le parc est presque exclusivement collectif et majoritairement locatif, à l'inverse du profil national. Les logements de deux pièces dominent, dans des immeubles construits pour l'essentiel avant 1946.",
    emploi: "Les cadres et professions intellectuelles forment la catégorie la plus représentée, et la part de diplômés du supérieur dépasse de plus de quinze points la moyenne française. Le chômage reste proche du niveau national.",
    elections: "La participation a dépassé de trois points la moyenne nationale. Le vote s'est porté nettement plus à gauche qu'en France, l'écart le plus marqué atteignant une quinzaine de points.",
    municipales: "La liste arrivée en tête réunit un peu plus du tiers des voix, dans un scrutin où la participation est restée sous la moitié des inscrits. Sa nuance dépasse de quelques points son score national.",
    climat: "Le climat est proche de celui de Rennes : des hivers doux, un mois de juillet qui culmine autour de 19 °C et une amplitude annuelle modérée. Les précipitations, réparties sur toute l'année, sont un peu supérieures à celles des villes de référence les plus sèches, avec un maximum en novembre et un minimum estival marqué.",
  },
  en: {
    fiscalite: "The property tax rate is well below the median rate for French communes, despite a rise of nearly three points since 2021. The commune applies the maximum surcharge on second homes.",
    securite: "Thefts without violence are the most frequent offence, at a level above the département average, but down by about a third over ten years.",
    demographie: "The population is markedly younger than the French average, with a strong presence of 15-29 year-olds. Median income is slightly below the national level.",
    logement: "The housing stock is almost entirely flats and mostly rented, the reverse of the national profile. Two-room dwellings dominate, in buildings mostly built before 1946.",
    emploi: "Managers and higher professional occupations form the largest category, and the share of higher-education graduates is more than fifteen points above the French average. Unemployment remains close to the national level.",
    elections: "Turnout was three points above the national average. The vote leaned markedly further left than in France, the widest gap reaching about fifteen points.",
    municipales: "The leading list won just over a third of the votes, in an election where turnout stayed below half of registered voters. Its political label scored a few points above its national result.",
    climat: "The climate is close to that of Rennes: mild winters, a July that peaks at around 19 °C and a moderate annual range. Rainfall, spread across the whole year, is slightly higher than in the driest reference cities, with a maximum in November and a marked summer minimum.",
  },
};

/**
 * Note de sécurité factice, rendue avec les phrases ci-dessus.
 *
 * "mauvais" : c'est le cran au libellé le plus long (« Nettement moins bonne que la
 * moyenne France »), donc celui qui éprouve la largeur de la tuile du bandeau.
 */
export const CARD_INSIGHTS_FIXTURE_SECURITY_RATING: SecurityRating = "mauvais";
