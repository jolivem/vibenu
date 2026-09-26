import type { RiskCategoryLevel, RiskLevel } from "../../../server-shared/domain/common.types";

export interface RiskCategory {
  code: string;
  name: string;
  level: RiskCategoryLevel;
  message: string;
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
  geometry: FloodZoneGeometry;
}

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
