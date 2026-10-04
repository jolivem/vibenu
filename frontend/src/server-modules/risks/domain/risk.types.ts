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
  /** Vrai quand la gravité vient de la commune alors que la lecture demandée était l'adresse. */
  communeFallback?: boolean;
  /** Vrai quand l'appel à Géorisques a échoué : le niveau « inconnu » est alors un repli. */
  unavailable?: boolean;
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
