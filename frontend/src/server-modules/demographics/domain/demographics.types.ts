export interface DemographicsAnalysis {
  codeIris: string;
  nomIris: string;
  nomCommune: string;
  population: number | null;
  density: number | null;
  ageDistribution: {
    pct0_14: number;
    pct15_29: number;
    pct30_44: number;
    pct45_59: number;
    pct60_74: number;
    pct75Plus: number;
  } | null;
  revenuMedian: number | null;
  tauxPauvrete: number | null;
  irisGeojson: string | null;
}
