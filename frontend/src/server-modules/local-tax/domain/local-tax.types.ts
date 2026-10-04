/**
 * Fiscalité locale d'une commune (DGFiP). Quatre blocs indépendants : chacun vaut `null`
 * quand sa source ne connaît pas la commune, sans empêcher les autres de s'afficher.
 *
 * Ce sont des taux. Le montant d'une taxe dépend de la valeur locative cadastrale du
 * logement, qui n'est pas publique : rien ici ne permet d'estimer un impôt en euros.
 */

/** Taxe foncière sur le bâti : taux global voté, en % de la base, hors ordures ménagères. */
export interface LocalTaxPropertyTax {
  /** Exercices couverts, croissants. */
  annees: number[];
  tauxGlobal: (number | null)[];
  /** Médiane des communes du département ; tout à `null` s'il en compte trop peu (Paris). */
  medianeDepartement: (number | null)[];
  medianeFrance: (number | null)[];
  /** Parts du dernier exercice. `autres` = syndicats et taxes spéciales (TSE, GEMAPI, TASA). */
  decomposition: {
    commune: number | null;
    intercommunalite: number | null;
    autres: number | null;
  };
  nomEpci: string | null;
  /** `null` : aucun taux publié, le service des déchets est financé autrement. Jamais « 0 % ». */
  teom: { taux: number; medianeFrance: number | null; medianeDepartement: number | null } | null;
}

/** Ce qui pèse sur une résidence secondaire ou un logement laissé vide. */
export interface LocalTaxSecondHomes {
  /** Taux global de taxe d'habitation, qui ne porte plus que sur les résidences secondaires. */
  tauxTh: {
    taux: number;
    annee: number;
    medianeFrance: number | null;
    medianeDepartement: number | null;
  } | null;
  majoration: {
    appliquee: boolean;
    tauxPct: number | null;
    annee: number;
    /** Communes de France ayant voté une majoration, et leur taux médian. */
    nbCommunesFrance: number | null;
    medianeFrance: number | null;
  } | null;
  /** Commune dans le périmètre de la taxe sur les logements vacants. */
  tlv: {
    soumise: boolean;
    annee: number;
    /** Communes du périmètre, sur le total. Le département manque s'il en compte trop peu. */
    france: { nb: number; total: number } | null;
    departement: { nb: number; total: number } | null;
  } | null;
}

/** Droits de mutation à titre onéreux : la part départementale des « frais de notaire ». */
export interface LocalTaxTransferDuty {
  tauxDepartemental: number;
  /** Renseigné seulement quand il est inférieur au taux courant. */
  tauxPrimoAccedant: number | null;
  /** Date de validité du barème, au format ISO. */
  valableAu: string;
  sourceUrl: string;
}

export const LOCAL_FINANCE_KEYS = ["dette", "impots", "equipement", "caf"] as const;
export type LocalFinanceKey = (typeof LOCAL_FINANCE_KEYS)[number];

/** Comptes de la commune, en euros par habitant, sur les derniers exercices. */
export interface LocalTaxFinances {
  /** Exercices couverts, croissants. */
  annees: number[];
  /** Faux quand la commune est seule dans sa strate (Paris) : la moyenne est alors elle-même. */
  strateComparable: boolean;
  indicateurs: Array<{
    cle: LocalFinanceKey;
    /** Une valeur par exercice. */
    parHabitant: (number | null)[];
    /** Moyenne des communes de taille comparable ; tout à `null` si non comparable. */
    moyenneStrate: (number | null)[];
  }>;
}

export interface LocalTaxAnalysis {
  /** Code réellement lu : celui de la ville pour un arrondissement. */
  codeCommune: string;
  /** Chiffres de la ville entière alors que l'adresse est dans un arrondissement (PLM). */
  villeEntiere: boolean;
  codeDepartement: string;
  taxeFonciere: LocalTaxPropertyTax | null;
  residencesSecondaires: LocalTaxSecondHomes | null;
  dmto: LocalTaxTransferDuty | null;
  finances: LocalTaxFinances | null;
}
