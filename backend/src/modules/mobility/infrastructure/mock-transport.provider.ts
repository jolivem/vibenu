import type { TransportProvider } from "./transport.provider.js";

export class MockTransportProvider implements TransportProvider {
  async findNearbyStops(): Promise<{
    nearestStops: Array<{ id: string; name: string; distanceMeters: number; mode: string }>;
    nearestStation?: { id: string; name: string; distanceMeters: number };
  }> {
    return {
      nearestStops: [
        { id: "stop_1", name: "Arrêt Hôtel de Ville", distanceMeters: 180, mode: "bus" },
        { id: "stop_2", name: "Arrêt Gare Centre", distanceMeters: 420, mode: "tram" },
        { id: "stop_3", name: "Arrêt République", distanceMeters: 650, mode: "bus" },
      ],
      nearestStation: { id: "station_1", name: "Gare Versailles Chantiers", distanceMeters: 1200 },
    };
  }
}
