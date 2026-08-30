import type { InseeProfile } from "./insee-profile.types";

export interface AgeDistribution {
  pct0_14: number;
  pct15_29: number;
  pct30_44: number;
  pct45_59: number;
  pct60_74: number;
  pct75Plus: number;
}

export interface AggregateStats {
  population: number | null;
  /** Habitants par km². Sur toute la surface des IRIS du périmètre. */
  density: number | null;
  ageDistribution: AgeDistribution | null;
  revenuMedian: number | null;
  tauxPauvrete: number | null;
}

/**
 * Le quartier consulté, avec ses repères commune et France.
 *
 * Les champs du quartier sont à plat et ses repères dans `communeStats` /
 * `nationalStats`, alors que les trois axes d'`InseeProfile` suivent la forme
 * régulière `{ iris, commune, france }`. C'est un héritage : la forme plate est
 * consommée telle quelle par la card, le PDF et le narratif, et l'aligner coûterait
 * une réécriture de tout ça pour rien de visible.
 */
export interface DemographicsAnalysis extends InseeProfile {
  codeIris: string;
  nomIris: string;
  nomCommune: string;
  population: number | null;
  density: number | null;
  ageDistribution: AgeDistribution | null;
  revenuMedian: number | null;
  tauxPauvrete: number | null;
  irisGeojson: string | null;
  communeStats: AggregateStats | null;
  nationalStats: AggregateStats | null;
  communeIrisCount: number;
}
