/**
 * Délinquance enregistrée par la police et la gendarmerie (SSMSI), maille communale.
 *
 * La maille est la plus fine qui existe en open data. À Paris, Lyon et Marseille la
 * commune est l'arrondissement ; ailleurs c'est la ville entière.
 */

/** Les indicateurs retenus, dans l'ordre d'affichage. Les 18 autres sont en base. */
export const SECURITY_INDICATORS = [
  "Cambriolages de logement",
  "Vols dans les véhicules",
  "Vols de véhicule",
  "Destructions et dégradations volontaires",
  "Violences physiques hors cadre familial",
] as const;

/**
 * Bornes du secret statistique.
 *
 * Le SSMSI publie le zéro et les effectifs à partir de 5, et masque 1 à 4 — motivé par
 * la fragilité des estimations sur petits effectifs et par la protection des personnes
 * concernées par les procédures. Une valeur masquée n'est donc pas une absence de
 * donnée : c'est cet intervalle, que l'écran restitue en bande d'incertitude.
 */
export const MASKED_MIN_FACTS = 1;
export const MASKED_MAX_FACTS = 4;

/**
 * Tranche de population du repère « communes de même taille » : 1 = moins de 2 000
 * habitants, 2 = 2 000 à 10 000, 3 = 10 000 à 50 000, 4 = 50 000 à 200 000, 5 = 200 000 et
 * plus. Les bornes sont fixées par l'import (`TRANCHES` dans `scripts/import_crime.py`) ;
 * les arrondissements de Paris, Lyon et Marseille prennent la tranche de leur ville.
 */
export type SecurityTranche = 1 | 2 | 3 | 4 | 5;

export interface SecurityIndicator {
  indicateur: string;
  /** Dénominateur du taux : la plupart pour 1 000 habitants, les cambriolages par logement. */
  base: "habitants" | "logements";
  /** Taux communal par année. `null` = valeur masquée, encadrée par les bornes ci-dessous. */
  commune: (number | null)[];
  /** Taux correspondant à 1 fait, sur les années masquées. `null` ailleurs. */
  borneBasse: (number | null)[];
  /** Taux correspondant à 4 faits, sur les années masquées. `null` ailleurs. */
  borneHaute: (number | null)[];
  departement: (number | null)[];
  france: (number | null)[];
  /** Taux de l'ensemble des communes de la même tranche de population. */
  memeTaille: (number | null)[];
}

export interface SecurityAnalysis {
  /** Années couvertes, croissantes. */
  annees: number[];
  /** Code du département servant de référence. */
  codeDepartement: string;
  /** `null` si la commune n'a pas pu être classée : la courbe de même taille manque alors. */
  tranche: SecurityTranche | null;
  indicateurs: SecurityIndicator[];
}
