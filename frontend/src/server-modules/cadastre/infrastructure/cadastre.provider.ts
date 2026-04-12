import type { CadastreAnalysis } from "../domain/cadastre.types";

export interface CadastreProvider {
  getCadastreData(lat: number, lon: number): Promise<CadastreAnalysis>;
}
