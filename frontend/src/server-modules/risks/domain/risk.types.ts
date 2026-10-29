import type { RiskCategoryLevel, RiskLevel } from "../../../server-shared/domain/common.types";

export interface RiskCategory {
  code: string;
  name: string;
  level: RiskCategoryLevel;
  /** Message rédigé en français, pour le périmètre resté en français et le prompt. */
  message: string;
  /**
   * Statut tel que Géorisques le publie (« Risque Existant - important »), à l'échelle
   * retenue. Texte source, en français : il se cite, il ne se traduit pas. `null` si absent.
   */
  statusDetail?: string | null;
  /**
   * Vrai quand Géorisques ne donne pas de niveau à l'adresse mais en donne un à la commune.
   * Le niveau (`level`) reste alors « inconnu », comme sur la page Géorisques de l'adresse ;
   * celui de la commune est dans `communeLevel`, et `statusDetail` porte son statut.
   */
  communeFallback?: boolean;
  /** Niveau publié pour la commune, quand celui de l'adresse manque (`communeFallback`). */
  communeLevel?: "élevé" | "modéré" | "présent" | "faible";
  /** Vrai quand l'appel à Géorisques a échoué : le niveau « inconnu » est alors un repli. */
  unavailable?: boolean;
  /**
   * Niveau lu dans une donnée importée, faute de rapport Géorisques : `argiles-2026`, la carte
   * d'exposition aux argiles (table `argiles_exposition`). Absent quand le niveau vient de l'API.
   */
  localSource?: "argiles-2026";
}

/**
 * Les reconnaissances de l'état de catastrophe naturelle de la commune (base GASPAR,
 * table `catnat_arrete`), depuis la création du régime en 1982.
 */
export interface CatnatHistory {
  /** Nombre de reconnaissances : un arrêté, un péril, une période. */
  total: number;
  /** Par péril, du plus fréquent au plus rare. `code` : code du JO (ICB, SEC…). */
  perils: { code: string; count: number; lastYear: number }[];
  /** Vrai pour un arrondissement : GASPAR ne connaît que la ville (75056, 69123, 13055). */
  villeEntiere: boolean;
  /** Dernière publication au JO présente dans le fichier importé (AAAA-MM-JJ). */
  dataUpTo: string | null;
}

export interface RiskAnalysis {
  categories: RiskCategory[];
  level: RiskLevel;
  /**
   * Les zonages PPR d'inondation autour du lieu, pour la carte.
   *
   * Séparés des `categories` : celles-ci disent *si* le lieu est concerné, à l'adresse et
   * à la commune, quand ces polygones disent *où*. Les pages commune SEO n'affichent que
   * les catégories, et n'ont donc aucune géométrie à charger.
   */
  floodZones?: FloodZone[];
  /** Historique des catastrophes naturelles de la commune ; `null` si la table manque. */
  catnat?: CatnatHistory | null;
}

/**
 * Une assiette de PPR inondation : le nom du plan, et son emprise.
 *
 * Le nom est porté jusqu'à l'écran parce qu'il est la seule façon pour le lecteur de
 * savoir *quel* plan le concerne — « PPRI du ru de Gally » se vérifie, un aplat bleu non.
 */
export interface FloodZone {
  label: string;
  /**
   * `zone` : l'emprise des zones réglementaires, qui suit les cours d'eau. `perimeter` : le
   * seul périmètre du plan, publié à la place de son zonage — un bassin versant entier,
   * collines comprises, qu'il serait faux de peindre comme inondable.
   */
  kind: FloodZoneKind;
  geometry: FloodZoneGeometry;
}

export type FloodZoneKind = "zone" | "perimeter";

export interface FloodZoneGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

/**
 * La fenêtre géographique interrogée, en degrés : `[ouest, sud, est, nord]`.
 *
 * C'est la use-case qui la calcule, pas le provider — elle seule sait si l'analyse porte
 * sur une adresse (boîte métrique autour du point) ou sur une commune (emprise du contour).
 */
export type FloodWindow = [number, number, number, number];
