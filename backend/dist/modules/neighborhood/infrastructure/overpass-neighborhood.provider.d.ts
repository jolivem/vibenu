import type { NeighborhoodPoi } from "../domain/neighborhood.types.js";
import type { NeighborhoodProvider } from "./neighborhood.provider.js";
/**
 * Neighborhood enrichment provider using Overpass API (OpenStreetMap)
 * Fetches schools, shops, parks, pharmacies, etc. around a location
 */
export declare class OverpassNeighborhoodProvider implements NeighborhoodProvider {
    private readonly overpassUrl;
    findNearbyPois(lat: number, lon: number, radiusMeters: number): Promise<NeighborhoodPoi[]>;
    private buildQuery;
    private parseElements;
    private resolveCategory;
    private defaultName;
    private calculateDistance;
}
