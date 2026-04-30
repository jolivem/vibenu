import { InMemoryCache } from "../../../server-shared/infrastructure/cache/in-memory-cache";
import type { GeoJsonGeometryDto } from "../../../server-shared/types/location-analysis.dto";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

interface GeoApiCommuneFeature {
  type: "Feature";
  geometry: GeoJsonGeometryDto;
  properties: Record<string, unknown>;
}

export class CommuneContourProvider {
  private static cache = new InMemoryCache<GeoJsonGeometryDto | null>(THIRTY_DAYS);
  private readonly baseUrl = "https://geo.api.gouv.fr";

  async getContour(citycode: string): Promise<GeoJsonGeometryDto | null> {
    const cached = CommuneContourProvider.cache.get(citycode);
    if (cached !== undefined) return cached;

    try {
      const response = await fetch(
        `${this.baseUrl}/communes/${citycode}?format=geojson&geometry=contour`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) {
        console.warn(`Commune contour API error: ${response.status} for ${citycode}`);
        CommuneContourProvider.cache.set(citycode, null);
        return null;
      }
      const data = (await response.json()) as GeoApiCommuneFeature;
      const geometry = data.geometry ?? null;
      CommuneContourProvider.cache.set(citycode, geometry);
      return geometry;
    } catch (error) {
      console.warn("Commune contour fetch error:", error);
      return null;
    }
  }
}
