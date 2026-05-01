import type { ElectionsService } from "./elections.service";
import type { ElectionsAnalysis } from "../domain/elections.types";
import type { ElectionsProvider } from "../infrastructure/elections.provider";

export class ElectionsServiceImpl implements ElectionsService {
  constructor(private readonly provider: ElectionsProvider) {}

  async getElectionsData(codeInsee: string | undefined): Promise<ElectionsAnalysis | null> {
    if (!codeInsee) return null;
    return this.provider.getResults(codeInsee);
  }
}
