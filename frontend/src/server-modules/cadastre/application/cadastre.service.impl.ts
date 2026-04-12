import type { CadastreService } from "./cadastre.service";
import type { CadastreAnalysis } from "../domain/cadastre.types";
import type { CadastreProvider } from "../infrastructure/cadastre.provider";

export class CadastreServiceImpl implements CadastreService {
  constructor(private readonly cadastreProvider: CadastreProvider) {}

  async getCadastreData(lat: number, lon: number): Promise<CadastreAnalysis> {
    return this.cadastreProvider.getCadastreData(lat, lon);
  }
}
