import type { TransportProvider } from "./transport.provider.js";
/**
 * Real transport provider using Overpass API (OpenStreetMap)
 * Fetches actual bus stops, tram stops, and train stations
 */
export declare class OverpassTransportProvider implements TransportProvider {
    private readonly overpassUrl;
    /**
     * Calculate distance in meters between two coordinates
     */
    private calculateDistance;
    /**
     * Build Overpass query for transport stops
     */
    private buildQuery;
    findNearbyStops(lat: number, lon: number, radiusMeters: number): Promise<{
        nearestStops: {
            id: string;
            name: string;
            distanceMeters: number;
            mode: string;
        }[];
        nearestStation: {
            id: string;
            name: string;
            distanceMeters: number;
            mode: string;
        } | undefined;
    }>;
    /**
     * Parse Overpass elements and convert to stops
     */
    private parseStops;
}
