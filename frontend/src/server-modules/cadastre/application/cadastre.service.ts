import type { CadastreAnalysis } from "../domain/cadastre.types";

export interface CadastreService {
  getCadastreData(lat: number, lon: number): Promise<CadastreAnalysis>;
}
