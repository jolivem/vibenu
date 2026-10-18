import type { RentAnalysis } from "../domain/rents.types";

export interface RentsProvider {
  /** Retourne null si la commune n'a aucun loyer publié. Ne lève jamais. */
  getRents(codeInsee: string, lat: number, lon: number): Promise<RentAnalysis | null>;
}
