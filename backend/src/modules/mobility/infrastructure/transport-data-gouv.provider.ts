import type { TransportProvider } from "./transport.provider.js";

interface GtfsStopFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    dataset_id: number;
    resource_id: number;
    dataset_title: string;
    stop_id: string;
    stop_name: string;
    data_import_id: number;
    resource_title: string;
    location_type: number; // 0 = stop, 1 = station, 2 = entrance
  };
}

interface GtfsStopsResponse {
  type: "FeatureCollection";
  features: GtfsStopFeature[];
}

/**
 * Transport provider using transport.data.gouv.fr GTFS stops API
 * Endpoint: GET /api/gtfs-stops with bounding box (experimental)
 * https://transport.data.gouv.fr
 */
export class TransportDataGouvProvider implements TransportProvider {
  private readonly apiUrl = "https://transport.data.gouv.fr/api";

  async findNearbyStops(lat: number, lon: number, radiusMeters: number) {
    try {
      // Convert radius to bounding box
      const bbox = this.radiusToBbox(lat, lon, radiusMeters);

      const response = await fetch(
        `${this.apiUrl}/gtfs-stops?south=${bbox.south}&north=${bbox.north}&west=${bbox.west}&east=${bbox.east}`,
        { headers: { Accept: "application/json" } },
      );

      if (!response.ok) {
        console.warn(`transport.data.gouv.fr API error: ${response.status}`);
        return { nearestStops: [], nearestStation: undefined };
      }

      const data = (await response.json()) as GtfsStopsResponse;
      return this.parseStops(data.features, lat, lon);
    } catch (error) {
      console.error("transport.data.gouv.fr provider error:", error);
      return { nearestStops: [], nearestStation: undefined };
    }
  }

  private parseStops(features: GtfsStopFeature[], centerLat: number, centerLon: number) {
    // Filter out entrances (location_type=2), keep stops (0) and stations (1)
    const filtered = features.filter((f) => f.properties.location_type !== 2);

    // Classify each feature first, then deduplicate per mode category
    const allStops = filtered.map((feature) => {
      const [lon, lat] = feature.geometry.coordinates;
      const distance = this.calculateDistance(centerLat, centerLon, lat, lon);
      const mode = this.inferMode(feature);
      return {
        id: feature.properties.stop_id,
        name: feature.properties.stop_name,
        distanceMeters: Math.round(distance),
        mode,
      };
    });

    // Deduplicate by name+mode (same name can be both a train station and a bus stop)
    const seen = new Map<string, (typeof allStops)[number]>();
    for (const stop of allStops) {
      const key = `${stop.name.toLowerCase().trim()}|${stop.mode}`;
      const existing = seen.get(key);
      if (!existing || stop.distanceMeters < existing.distanceMeters) {
        seen.set(key, stop);
      }
    }

    const stops = Array.from(seen.values()).sort((a, b) => a.distanceMeters - b.distanceMeters);

    const stations = stops.filter(
      (s) => s.mode === "train" || s.mode === "rer" || s.mode === "metro",
    );
    const regularStops = stops.filter(
      (s) => s.mode !== "train" && s.mode !== "rer" && s.mode !== "metro",
    );

    return {
      nearestStops: regularStops.slice(0, 5),
      nearestStation: stations.length > 0 ? stations[0] : undefined,
    };
  }

  private inferMode(feature: GtfsStopFeature): string {
    const title = feature.properties.dataset_title.toLowerCase();
    const name = feature.properties.stop_name.toLowerCase();

    const isRailDataset =
      title.includes("sncf") || title.includes("transilien") || /\bter\b/.test(title);

    if (isRailDataset) {
      // SNCF datasets include bus feeder stops and multimodal hubs.
      // Real train stations have location_type=1 and simple names (no "/").
      // Names with "/" like "République - La Poste / Ecole Militaire" are bus hubs.
      if (feature.properties.location_type === 1 && !name.includes("/")) return "train";
      return "bus";
    }

    if (title.includes("idfm") || title.includes("île-de-france")) {
      if (name.includes("rer ") || name.match(/\brer\b/)) return "rer";
      if (name.includes("métro") || name.includes("metro")) return "metro";
      if (name.includes("tram")) return "tram";
      return "bus";
    }

    if (title.includes("tram")) return "tram";

    return "bus";
  }

  private radiusToBbox(lat: number, lon: number, radiusMeters: number) {
    const latDelta = radiusMeters / 111_320;
    const lonDelta = radiusMeters / (111_320 * Math.cos((lat * Math.PI) / 180));

    return {
      south: lat - latDelta,
      north: lat + latDelta,
      west: lon - lonDelta,
      east: lon + lonDelta,
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6_371_000;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dPhi / 2) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
