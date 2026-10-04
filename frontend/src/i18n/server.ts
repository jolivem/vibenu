import { analysis as en } from "./messages/en/analysis";
import { analysis as fr, type AnalysisMessages } from "./messages/fr/analysis";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";

/**
 * Messages de l'analyse par langue, pour le serveur — c'est le seul module autorisé à
 * importer toutes les langues à la fois. Ne jamais l'importer depuis un composant client :
 * il embarquerait chaque dictionnaire dans le navigateur.
 */
const ANALYSIS_MESSAGES: Record<Locale, AnalysisMessages> = { fr, en };

export function getAnalysisMessages(locale: Locale): AnalysisMessages {
  return ANALYSIS_MESSAGES[locale];
}

/** Langue demandée par un paramètre de requête ; le français à défaut ou en cas de valeur inconnue. */
export function parseLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
