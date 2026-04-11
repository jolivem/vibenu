/**
 * Real transport provider using Overpass API (OpenStreetMap)
 * Fetches actual bus stops, tram stops, and train stations
 */
export class OverpassTransportProvider {
    overpassUrl = "https://overpass-api.de/api/interpreter";
    /**
     * Calculate distance in meters between two coordinates
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    /**
     * Build Overpass query for transport stops
     */
    buildQuery(lat, lon, radiusMeters) {
        const radiusDegrees = radiusMeters / 111000; // Rough conversion
        const query = `
      [bbox:${lat - radiusDegrees},${lon - radiusDegrees},${lat + radiusDegrees},${lon + radiusDegrees}];
      (
        node["public_transport"="stop_position"]["bus"~"yes|true"];
        node["public_transport"="stop_position"]["tram"~"yes|true"];
        node["public_transport"="stop_position"]["train"~"yes|true"];
        node["amenity"="bus_station"];
        node["amenity"="parking"];
        node["railway"="station"];
        way["public_transport"="platform"];
      );
      out center;
    `;
        return query;
    }
    async findNearbyStops(lat, lon, radiusMeters) {
        try {
            const query = this.buildQuery(lat, lon, radiusMeters);
            const response = await fetch(this.overpassUrl, {
                method: "POST",
                body: query,
                headers: { "Content-Type": "application/osm3s" },
            });
            if (!response.ok) {
                console.warn(`Overpass API error: ${response.statusText}`);
                return { nearestStops: [], nearestStation: undefined };
            }
            const data = (await response.json());
            const stops = this.parseStops(data.elements, lat, lon);
            const stations = stops.filter((s) => s.mode === "train").slice(0, 1);
            const nearestStops = stops.filter((s) => s.mode !== "train").slice(0, 5);
            return {
                nearestStops,
                nearestStation: stations.length > 0 ? stations[0] : undefined,
            };
        }
        catch (error) {
            console.error("Overpass transport provider error:", error);
            return { nearestStops: [], nearestStation: undefined };
        }
    }
    /**
     * Parse Overpass elements and convert to stops
     */
    parseStops(elements, centerLat, centerLon) {
        const stops = elements
            .filter((el) => el.lat && el.lon && el.tags)
            .map((el) => {
            const lat = el.lat;
            const lon = el.lon;
            const tags = el.tags;
            let mode = "bus"; // default
            if (tags.tram === "yes" || tags.tram === "true")
                mode = "tram";
            if (tags.train === "yes" || tags.train === "true")
                mode = "train";
            if (tags.railway === "station")
                mode = "train";
            if (tags.amenity === "bus_station")
                mode = "bus";
            const distance = this.calculateDistance(centerLat, centerLon, lat, lon);
            const name = tags.name || `${mode.charAt(0).toUpperCase() + mode.slice(1)} stop`;
            return {
                id: `${el.type}_${el.id}`,
                name,
                distanceMeters: Math.round(distance),
                mode,
            };
        })
            .sort((a, b) => a.distanceMeters - b.distanceMeters);
        return stops;
    }
}
//# sourceMappingURL=overpass-transport.provider.js.map