import type { RentsService } from "./rents.service";
import type { RentAnalysis } from "../domain/rents.types";
import type { RentsProvider } from "../infrastructure/rents.provider";

export class RentsServiceImpl implements RentsService {
  constructor(private readonly provider: RentsProvider) {}

  async getRents(codeInsee: string | undefined, lat: number, lon: number): Promise<RentAnalysis | null> {
    if (!codeInsee) return null;
    return this.provider.getRents(codeInsee, lat, lon);
  }
}
