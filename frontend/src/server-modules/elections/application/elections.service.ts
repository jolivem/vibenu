import type { ElectionsAnalysis } from "../domain/elections.types";

export interface ElectionsService {
  getElectionsData(codeInsee: string | undefined): Promise<ElectionsAnalysis | null>;
}
