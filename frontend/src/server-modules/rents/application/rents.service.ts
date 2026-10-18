import type { RentAnalysis } from "../domain/rents.types";

export interface RentsService {
  getRents(codeInsee: string | undefined, lat: number, lon: number): Promise<RentAnalysis | null>;
}
