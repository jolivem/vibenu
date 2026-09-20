/**
 * Ce qu'on envoie au modèle pour qu'il rédige les mini-synthèses des cards.
 *
 * Principe directeur : **on ne demande pas au modèle de lire une série, on lui donne
 * la lecture déjà faite**. Les tendances, les écarts et les classes dominantes sont
 * calculés en TypeScript ; le modèle ne fait que les verbaliser en français courant.
 * Un LLM qui compare douze nombres de tête se trompe ; un LLM à qui l'on dit « en
 * baisse de 30 % » et qui doit l'écrire en une phrase ne se trompe pas.
 *
 * Corollaire sur le volume : aucune série brute ne part. Le climat seul en compte 144
 * (12 mois × 3 mesures × 4 villes) ; on en envoie une vingtaine de champs dérivés.
 *
 * Les noms de champs sont en français et en snake_case, comme dans le prompt commune :
 * le prompt est en français, et des clés anglaises créent un décrochage que le modèle
 * paie en cohérence.
 */

import type { AnalysisMode } from "@/server-shared/types/location-analysis.dto";
import type { Tendance } from "@/server-shared/domain/trend";

/** Sens d'une évolution — défini avec son seuil, partagé avec les pages commune SEO. */
export type { Tendance };

/** Une valeur locale et son repère national, avec l'écart déjà fait. */
export interface IndicateurCompare {
  libelle: string;
  unite: string;
  valeur_locale: number | null;
  valeur_france: number | null;
  /** En points quand l'unité est un pourcentage, sinon absent. */
  ecart_pts?: number | null;
  /** En pourcentage relatif, pour les grandeurs qui ne sont pas des parts (revenu…). */
  ecart_pct?: number | null;
}

/**
 * La classe la plus représentée d'un graphe de répartition, et son écart au national.
 *
 * C'est tout ce qu'une phrase peut dire d'un histogramme à 5 ou 7 barres : la forme
 * générale et le point saillant. Envoyer les 7 valeurs inviterait le modèle à les
 * énumérer, ce que le prompt lui interdit par ailleurs.
 */
export interface ClasseDominante {
  classe: string;
  pct_local: number;
  pct_france: number | null;
  ecart_pts: number | null;
}

/** Une part d'une partition (barre empilée), locale et nationale. */
export interface PartCompare {
  libelle: string;
  pct_local: number | null;
  pct_france: number | null;
}

// --- Sécurité ---------------------------------------------------------------

export interface SecuriteIndicateurInput {
  indicateur: string;
  unite: string;
  taux_derniere_annee: number | null;
  tendance_10ans: Tendance | null;
  evolution_10ans_pct: number | null;
  /** Écarts en pourcentage, sauf dès le double du repère : `null`, et le multiple prend le relais. */
  ecart_vs_departement_pct: number | null;
  multiple_vs_departement: number | null;
  ecart_vs_france_pct: number | null;
  multiple_vs_france: number | null;
  /**
   * Nombre d'années sous secret statistique. Une valeur masquée signifie 1 à 4 faits
   * dans l'année — donc un phénomène rare, et surtout PAS une donnée manquante.
   */
  annees_masquees: number;
}

export interface SecuriteInsightInput {
  maille: "commune" | "arrondissement";
  periode: string;
  indicateurs: SecuriteIndicateurInput[];
}

// --- Démographie ------------------------------------------------------------

export interface DemographieInsightInput {
  population: number | null;
  densite_hab_km2: number | null;
  indicateurs: IndicateurCompare[];
  tranches_age: Array<{ tranche: string; pct_local: number; pct_france: number | null; ecart_pts: number | null }>;
  tranche_sur_representee: string | null;
  tranche_sous_representee: string | null;
}

// --- Logement ---------------------------------------------------------------

export interface LogementInsightInput {
  logements: number | null;
  indicateurs: IndicateurCompare[];
  statut_occupation: PartCompare[];
  pieces_dominant: ClasseDominante | null;
  epoques_dominant: ClasseDominante | null;
}

// --- Emploi et qualifications ----------------------------------------------

export interface EmploiInsightInput {
  indicateurs: IndicateurCompare[];
  csp_dominante: ClasseDominante | null;
  diplome_dominant: ClasseDominante | null;
}

// --- Ménages et familles ----------------------------------------------------

export interface MenagesInsightInput {
  indicateurs: IndicateurCompare[];
  composition: PartCompare[];
  enfants_dominant: ClasseDominante | null;
}

// --- Élections --------------------------------------------------------------

export interface ElectionsInsightInput {
  scrutin: string;
  participation_pct: number;
  participation_france_pct: number;
  ecart_participation_pts: number;
  candidats: Array<{
    candidat: string;
    parti: string;
    pct_local: number;
    pct_national: number;
    ecart_pts: number;
  }>;
}

// --- Municipales ------------------------------------------------------------

export interface MunicipalesInsightInput {
  scrutin: string;
  /** Résultat de la ville entière alors que l'adresse est dans un arrondissement (PLM). */
  ville_entiere: boolean;
  participation_pct: number;
  /**
   * Les listes ne sont nuancées que dans les communes d'une certaine taille — 91 % n'ont
   * aucune étiquette politique, et il n'y a alors pas de score national à comparer. Le
   * prompt doit le savoir pour ne pas chercher un écart qui n'existe pas.
   */
  nuancee: boolean;
  listes: Array<{
    liste: string;
    nuance: string | null;
    pct_local: number;
    pct_national: number | null;
    ecart_pts: number | null;
    sieges: number | null;
  }>;
}

// --- Climat -----------------------------------------------------------------

export interface ClimatInsightInput {
  periode: string;
  temperature: {
    moyenne_annuelle_c: number;
    mois_plus_chaud: string;
    c_max: number;
    mois_plus_froid: string;
    c_min: number;
    amplitude_c: number;
  } | null;
  precipitations: {
    cumul_annuel_mm: number;
    mois_plus_humide: string;
    mm_max: number;
    mois_plus_sec: string;
    mm_min: number;
  } | null;
  ensoleillement: { cumul_annuel_h: number } | null;
  villes_reference: Array<{
    nom: string;
    type_climat: string | null;
    temp_annuelle_c: number | null;
    precip_annuelles_mm: number | null;
  }>;
  /**
   * Ville de référence dont le profil sur 12 mois s'écarte le moins du profil local.
   * Calculée en TS (erreur moyenne absolue sur les mesures normalisées) : c'est la
   * phrase que la card promet, et la laisser au modèle reviendrait à lui demander de
   * comparer 144 nombres de tête.
   */
  ville_reference_la_plus_proche: string | null;
}

// --- Racine -----------------------------------------------------------------

export interface CardInsightsInput {
  /** Commande l'échelle du propos : un quartier, ou une commune entière. */
  mode: AnalysisMode;
  /** « Quartier Belleville — Paris 20e » ou « Commune de Rennes ». */
  perimetre: string;
  securite?: SecuriteInsightInput;
  demographie?: DemographieInsightInput;
  logement?: LogementInsightInput;
  emploi?: EmploiInsightInput;
  menages?: MenagesInsightInput;
  elections?: ElectionsInsightInput;
  municipales?: MunicipalesInsightInput;
  climat?: ClimatInsightInput;
}
