import type { CadastreService } from "./cadastre.service.js";
import type { CadastreAnalysis } from "../domain/cadastre.types.js";
import type { CadastreProvider } from "../infrastructure/cadastre.provider.js";

export class CadastreServiceImpl implements CadastreService {
  constructor(private readonly cadastreProvider: CadastreProvider) {}

  async getCadastreData(lat: number, lon: number): Promise<CadastreAnalysis> {
    return this.cadastreProvider.getCadastreData(lat, lon);
  }
}
