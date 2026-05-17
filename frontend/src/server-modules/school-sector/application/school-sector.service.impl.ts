import type { SchoolSectorService } from "./school-sector.service";
import type { SchoolSector } from "../domain/school-sector.types";
import type { SchoolSectorProvider } from "../infrastructure/school-sector.provider";

export class SchoolSectorServiceImpl implements SchoolSectorService {
  constructor(private readonly provider: SchoolSectorProvider) {}

  async getCollegeSector(lat: number, lon: number): Promise<SchoolSector | null> {
    return this.provider.getCollegeSectorForPoint(lat, lon);
  }
}
