import type { ElectionsAnalysis } from "../domain/elections.types";
import type { MunicipalesAnalysis } from "../domain/municipales.types";

export interface ElectionsService {
  getElectionsData(codeInsee: string | undefined): Promise<ElectionsAnalysis | null>;
  getMunicipalesData(codeInsee: string | undefined): Promise<MunicipalesAnalysis | null>;
}
