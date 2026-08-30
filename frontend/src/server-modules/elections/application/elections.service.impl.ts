import type { ElectionsService } from "./elections.service";
import type { ElectionsAnalysis } from "../domain/elections.types";
import type { ElectionsProvider } from "../infrastructure/elections.provider";
import type { MunicipalesAnalysis } from "../domain/municipales.types";
import type { MunicipalesProvider } from "../infrastructure/municipales-database.provider";

export class ElectionsServiceImpl implements ElectionsService {
  constructor(
    private readonly provider: ElectionsProvider,
    private readonly municipales: MunicipalesProvider,
  ) {}

  async getElectionsData(codeInsee: string | undefined): Promise<ElectionsAnalysis | null> {
    if (!codeInsee) return null;
    return this.provider.getResults(codeInsee);
  }

  async getMunicipalesData(codeInsee: string | undefined): Promise<MunicipalesAnalysis | null> {
    if (!codeInsee) return null;
    return this.municipales.getResults(codeInsee);
  }
}
