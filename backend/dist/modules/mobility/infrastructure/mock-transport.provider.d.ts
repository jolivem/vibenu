import type { TransportProvider } from "./transport.provider.js";
export declare class MockTransportProvider implements TransportProvider {
    findNearbyStops(): Promise<{
        nearestStops: Array<{
            id: string;
            name: string;
            distanceMeters: number;
            mode: string;
        }>;
        nearestStation?: {
            id: string;
            name: string;
            distanceMeters: number;
        };
    }>;
}
