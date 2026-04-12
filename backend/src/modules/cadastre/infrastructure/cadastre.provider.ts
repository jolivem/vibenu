import type { CadastreAnalysis } from "../domain/cadastre.types.js";

export interface CadastreProvider {
  getCadastreData(lat: number, lon: number): Promise<CadastreAnalysis>;
}
