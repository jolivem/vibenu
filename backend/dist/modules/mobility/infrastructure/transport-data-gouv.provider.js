/**
 * Transport provider using transport.data.gouv.fr GTFS stops API
 * Endpoint: GET /api/gtfs-stops with bounding box (experimental)
 * https://transport.data.gouv.fr
 */
export class TransportDataGouvProvider {
    apiUrl = "https://transport.data.gouv.fr/api";
    async findNearbyStops(lat, lon, radiusMeters) {
        try {
            // Convert radius to bounding box
            const bbox = this.radiusToBbox(lat, lon, radiusMeters);
            const response = await fetch(`${this.apiUrl}/gtfs-stops?south=${bbox.south}&north=${bbox.north}&west=${bbox.west}&east=${bbox.east}`, { headers: { Accept: "application/json" } });
            if (!response.ok) {
                console.warn(`transport.data.gouv.fr API error: ${response.status}`);
                return { nearestStops: [], nearestStation: undefined };
            }
            const data = (await response.json());
            return this.parseStops(data.features, lat, lon);
        }
        catch (error) {
            console.error("transport.data.gouv.fr provider error:", error);
            return { nearestStops: [], nearestStation: undefined };
        }
    }
    parseStops(features, centerLat, centerLon) {
        // Deduplicate by stop_name (different datasets may have same stop)
        const seen = new Map();
        for (const feature of features) {
            const [lon, lat] = feature.geometry.coordinates;
            const distance = this.calculateDistance(centerLat, centerLon, lat, lon);
            const key = feature.properties.stop_name.toLowerCase().trim();
            const existing = seen.get(key);
            if (!existing || distance < existing.distance) {
                seen.set(key, { feature, distance });
            }
        }
        const stops = Array.from(seen.values())
            .map(({ feature, distance }) => {
            const mode = this.inferMode(feature);
            return {
                id: feature.properties.stop_id,
                name: feature.properties.stop_name,
                distanceMeters: Math.round(distance),
                mode,
            };
        })
            .sort((a, b) => a.distanceMeters - b.distanceMeters);
        // Separate stations (location_type=1 or train mode) from regular stops
        const stations = stops.filter((s) => s.mode === "train" || s.mode === "rer" || s.mode === "metro");
        const regularStops = stops.filter((s) => s.mode !== "train" && s.mode !== "rer" && s.mode !== "metro");
        return {
            nearestStops: regularStops.slice(0, 5),
            nearestStation: stations.length > 0 ? stations[0] : undefined,
        };
    }
    inferMode(feature) {
        const title = feature.properties.dataset_title.toLowerCase();
        const name = feature.properties.stop_name.toLowerCase();
        // Infer from dataset title
        if (title.includes("sncf") || title.includes("transilien") || title.includes("ter")) {
            return "train";
        }
        if (title.includes("idfm") || title.includes("île-de-france mobilités")) {
            // IDFM covers metro, RER, bus, tram — try to narrow from stop name
            if (name.includes("rer ") || name.match(/\brer\b/))
                return "rer";
            if (name.includes("métro") || name.includes("metro"))
                return "metro";
            if (name.includes("tram"))
                return "tram";
        }
        if (title.includes("tram"))
            return "tram";
        // location_type 1 = station (likely rail)
        if (feature.properties.location_type === 1)
            return "train";
        return "bus";
    }
    radiusToBbox(lat, lon, radiusMeters) {
        const latDelta = radiusMeters / 111_320;
        const lonDelta = radiusMeters / (111_320 * Math.cos((lat * Math.PI) / 180));
        return {
            south: lat - latDelta,
            north: lat + latDelta,
            west: lon - lonDelta,
            east: lon + lonDelta,
        };
    }
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6_371_000;
        const phi1 = (lat1 * Math.PI) / 180;
        const phi2 = (lat2 * Math.PI) / 180;
        const dPhi = ((lat2 - lat1) * Math.PI) / 180;
        const dLambda = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dPhi / 2) ** 2 +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
//# sourceMappingURL=transport-data-gouv.provider.js.map