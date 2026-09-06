/**
 * Mini-synthèses IA affichées sous le titre des cards à graphiques.
 *
 * Une phrase ou deux par card, qui disent ce qu'il faut comprendre du graphique juste
 * en dessous — pour le lecteur qui n'a ni le temps ni les repères pour lire les courbes.
 * Les sept clés sont produites par un seul appel au modèle, qui répond en JSON.
 *
 * Cette liste est la source unique : le type, le format de sortie du prompt, le parseur
 * et le cache en dérivent tous. Ajouter une card revient à ajouter une entrée ici, puis
 * à laisser le compilateur désigner les endroits à compléter.
 */

export const CARD_INSIGHT_KEYS = [
  "securite",
  "demographie",
  "logement",
  "emploi",
  "menages",
  "elections",
  "climat",
] as const;

export type CardInsightKey = (typeof CARD_INSIGHT_KEYS)[number];

/**
 * Une phrase par card *effectivement rendue*. Une clé absente n'est pas une erreur :
 * c'est une card sans données (donc non rendue), ou une phrase que le modèle n'a pas
 * produite — sa card s'affiche alors simplement sans synthèse.
 */
export type CardInsights = Partial<Record<CardInsightKey, string>>;

export interface CardInsightsDto {
  insights: CardInsights;
  generatedAt: string;
  cached: boolean;
  /**
   * Payload envoyé au modèle. Présent uniquement quand NEXT_PUBLIC_DEBUG=true côté
   * serveur — c'est le seul moyen d'inspecter ce qui part réellement chez le fournisseur.
   * Typé `unknown` dans le contrat public ; la forme typée (`CardInsightsInput`) vit
   * dans le domain.
   */
  debugInput?: unknown;
}
