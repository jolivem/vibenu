import type { TransportProvider } from "./transport.provider.js";
/**
 * Transport provider using transport.data.gouv.fr GTFS stops API
 * Endpoint: GET /api/gtfs-stops with bounding box (experimental)
 * https://transport.data.gouv.fr
 */
export declare class TransportDataGouvProvider implements TransportProvider {
    private readonly apiUrl;
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
    private parseStops;
    private inferMode;
    private radiusToBbox;
    private calculateDistance;
}
