import type { CadastreAnalysis } from "../domain/cadastre.types.js";

export interface CadastreService {
  getCadastreData(lat: number, lon: number): Promise<CadastreAnalysis>;
}
