export class MockTransportProvider {
    async findNearbyStops() {
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
//# sourceMappingURL=mock-transport.provider.js.map