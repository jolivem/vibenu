/**
 * Mini-synthèses IA affichées sous le titre des cards à graphiques.
 *
 * Une phrase ou deux par card, qui disent ce qu'il faut comprendre du graphique juste
 * en dessous — pour le lecteur qui n'a ni le temps ni les repères pour lire les courbes.
 * Les huit clés sont produites par un seul appel au modèle, qui répond en JSON.
 *
 * Cette liste est la source unique : le type, le format de sortie du prompt, le parseur
 * et le cache en dérivent tous. Ajouter une card revient à ajouter une entrée ici, puis
 * à laisser le compilateur désigner les endroits à compléter.
 *
 * Le même appel rend aussi une note de sécurité (`SecurityRating`), affichée dans le
 * bandeau de chiffres clés — un mot, là où les autres tuiles portent un nombre.
 */

export const CARD_INSIGHT_KEYS = [
  "securite",
  "demographie",
  "logement",
  "emploi",
  "menages",
  "elections",
  "municipales",
  "climat",
] as const;

export type CardInsightKey = (typeof CARD_INSIGHT_KEYS)[number];

/**
 * Une phrase par card *effectivement rendue*. Une clé absente n'est pas une erreur :
 * c'est une card sans données (donc non rendue), ou une phrase que le modèle n'a pas
 * produite — sa card s'affiche alors simplement sans synthèse.
 */
export type CardInsights = Partial<Record<CardInsightKey, string>>;

/**
 * Échelle de la note de sécurité, demandée au modèle dans le même appel que les phrases.
 *
 * Rupture assumée avec le principe « on calcule, le modèle verbalise » qui régit tout le
 * reste du module : ici le classement lui-même vient du modèle. Le prompt ancre donc
 * chaque cran sur les écarts déjà calculés (`ecart_vs_france_pct`, `tendance_10ans`) pour
 * que la note reste reproductible d'un appel à l'autre, et le parseur refuse toute valeur
 * hors de cette liste.
 *
 * La note qualifie le lieu **par rapport à la France**, jamais dans l'absolu : « mauvais »
 * veut dire « nettement au-dessus de la moyenne française », pas « dangereux ». Elle se
 * fondait sur le département et la France à la fois, ce que la tuile, qui ne nomme que la
 * France, ne pouvait pas dire.
 */
export const SECURITY_RATINGS = ["excellent", "bon", "moyen", "mediocre", "mauvais"] as const;

export type SecurityRating = (typeof SECURITY_RATINGS)[number];

/**
 * Libellés affichés dans la tuile « Sécurité ». Les clés restent sans accent : ce sont des
 * clés de protocole, partagées avec le prompt, le parseur et le cache.
 *
 * Comparatifs, parce que la note l'est : « Moyen », « Bon » ou « Mauvais » se lisaient dans
 * l'absolu, et « Moyen » laissait croire à une sécurité médiocre là où le lieu est
 * simplement dans la moyenne. Le repère est nommé — la France, seul repère sur lequel le
 * prompt fonde la note (cf. `card-insights.prompt.ts`).
 */
export const SECURITY_RATING_LABELS: Record<SecurityRating, string> = {
  excellent: "Bien meilleure que la moyenne France",
  bon: "Meilleure que la moyenne France",
  moyen: "Dans la moyenne France",
  mediocre: "Moins bonne que la moyenne France",
  mauvais: "Nettement moins bonne que la moyenne France",
};

/**
 * Ce qu'un appel au modèle produit, et ce que le cache Postgres stocke tel quel.
 *
 * Le passage de `CardInsights` nu à cet objet enveloppe change la forme de la colonne
 * `content` : c'est pour cela que `CARD_INSIGHTS_PROMPT_VERSION` est passée à 2. Les
 * lignes de la version 1 ne sont plus servies, donc aucune migration n'est nécessaire.
 */
export interface CardInsightsPayload {
  insights: CardInsights;
  /**
   * Absente si la card « Sécurité » n'est pas rendue, ou si le modèle n'a pas répondu
   * une valeur de l'échelle. La tuile de sécurité disparaît alors du bandeau.
   */
  securityRating?: SecurityRating;
}

export interface CardInsightsDto extends CardInsightsPayload {
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
