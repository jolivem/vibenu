import type { SchoolsService } from "./schools.service";
import type { NearbySchools } from "../domain/schools.types";
import type { SchoolsProvider } from "../infrastructure/schools.provider";

export class SchoolsServiceImpl implements SchoolsService {
  constructor(private readonly provider: SchoolsProvider) {}

  getNearbySchools(
    lat: number,
    lon: number,
    options: { codeCommune?: string; sectorCollege?: string | null } = {},
  ): Promise<NearbySchools | null> {
    const { codeCommune, sectorCollege = null } = options;
    return this.provider.getNearbySchools(
      codeCommune
        ? { scope: "commune", lat, lon, codeCommune, sectorCollege }
        : { scope: "rayon", lat, lon, sectorCollege },
    );
  }
}
