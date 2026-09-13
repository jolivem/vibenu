import type { TransportProvider, TransportStopsResult } from "./transport.provider";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";

const ONE_DAY = 24 * 60 * 60 * 1000;

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

interface LocatedStop {
  id: string;
  name: string;
  distanceMeters: number;
  mode: string;
  lat: number;
  lon: number;
}

/**
 * Mots qui ne distinguent pas un lieu : « Gare de Paris Montparnasse Hall 1 - 2 » et
 * « Paris-Montparnasse Point Rencontre Groupes » se réduisent tous deux à « montparnasse ».
 */
const NAME_STOPWORDS = new Set([
  "gare", "gares", "station", "paris", "hall", "arret", "sncf", "rer", "metro", "tram",
  "ligne", "quai", "sortie",
]);

function nameTokens(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !NAME_STOPWORDS.has(t));
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

/**
 * Une même gare revient sous plusieurs noms, un par jeu de données GTFS : Montparnasse
 * compte cinq entrées dans un rayon de 500 m (« Gare Montparnasse », « Paris Montparnasse
 * Hall 1 - 2 », « … Vaugirard »…). Deux entrées sont la même gare si elles partagent un
 * mot significatif et se trouvent à moins de 500 m l'une de l'autre — l'emprise d'une
 * grande gare.
 */
function sameStation(a: LocatedStop, b: LocatedStop): boolean {
  if (haversineMeters(a.lat, a.lon, b.lat, b.lon) > 500) return false;
  const tokens = new Set(nameTokens(a.name).filter((t) => t.length >= 5));
  return nameTokens(b.name).some((t) => t.length >= 5 && tokens.has(t));
}

/**
 * Les deux sens d'une ligne portent parfois le même nom dans un ordre inversé
 * (« Lycée - Pasteur Buffon » et « Pasteur - Lycée Buffon »). Même ensemble de mots, à
 * moins de 150 m : le même arrêt. Un mot commun ne suffit pas — « Pasteur - Falguière » et
 * « Pasteur - Docteur Roux » sont deux arrêts distincts.
 */
function sameStop(a: LocatedStop, b: LocatedStop): boolean {
  if (haversineMeters(a.lat, a.lon, b.lat, b.lon) > 150) return false;
  const ta = [...new Set(nameTokens(a.name))].sort().join(" ");
  const tb = [...new Set(nameTokens(b.name))].sort().join(" ");
  return ta !== "" && ta === tb;
}

/** Nombre de lieux distincts : chaque entrée qui ne rejoint aucun lieu déjà vu en ouvre un. */
function countSites(items: LocatedStop[], same: (a: LocatedStop, b: LocatedStop) => boolean): number {
  const sites: LocatedStop[] = [];
  for (const item of items) {
    if (!sites.some((site) => same(site, item))) sites.push(item);
  }
  return sites.length;
}

/**
 * Transport provider using transport.data.gouv.fr GTFS stops API
 * Endpoint: GET /api/gtfs-stops with bounding box (experimental)
 * https://transport.data.gouv.fr
 */
export class TransportDataGouvProvider implements TransportProvider {
  private static cache = new InMemoryCache<TransportStopsResult>(ONE_DAY);
  // v2 : le résultat porte les comptages, absents des entrées de l'ancien format.
  private static readonly CACHE_VERSION = "v2";
  private readonly apiUrl = "https://transport.data.gouv.fr/api";

  async findNearbyStops(lat: number, lon: number, radiusMeters: number, countRadiusMeters = 500) {
    const cacheKey = `${TransportDataGouvProvider.CACHE_VERSION}:${buildGeoKey(lat, lon)}:${radiusMeters}:${countRadiusMeters}`;
    const cached = TransportDataGouvProvider.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Convert radius to bounding box
      const bbox = this.radiusToBbox(lat, lon, radiusMeters);

      const response = await fetch(
        `${this.apiUrl}/gtfs-stops?south=${bbox.south}&north=${bbox.north}&west=${bbox.west}&east=${bbox.east}`,
        { headers: { Accept: "application/json" } },
      );

      if (!response.ok) {
        console.warn(`transport.data.gouv.fr API error: ${response.status}`);
        return { nearestStops: [], nearestStations: [] };
      }

      const data = (await response.json()) as GtfsStopsResponse;
      const result = this.parseStops(data.features, lat, lon, countRadiusMeters);
      TransportDataGouvProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("transport.data.gouv.fr provider error:", error);
      return { nearestStops: [], nearestStations: [] };
    }
  }

  private parseStops(
    features: GtfsStopFeature[],
    centerLat: number,
    centerLon: number,
    countRadiusMeters: number,
  ): TransportStopsResult {
    // Filter out entrances (location_type=2), keep stops (0) and stations (1)
    const filtered = features.filter((f) => f.properties.location_type !== 2);

    // Classify each feature first, then deduplicate per mode category
    const allStops: LocatedStop[] = filtered.map((feature) => {
      const [lon, lat] = feature.geometry.coordinates;
      const distance = haversineMeters(centerLat, centerLon, lat, lon);
      const mode = this.inferMode(feature);
      return {
        id: feature.properties.stop_id,
        name: feature.properties.stop_name,
        distanceMeters: Math.round(distance),
        mode,
        lat,
        lon,
      };
    });

    // Deduplicate by name+mode (same name can be both a train station and a bus stop)
    const seen = new Map<string, LocatedStop>();
    for (const stop of allStops) {
      const key = `${stop.name.toLowerCase().trim()}|${stop.mode}`;
      const existing = seen.get(key);
      if (!existing || stop.distanceMeters < existing.distanceMeters) {
        seen.set(key, stop);
      }
    }

    const stops = Array.from(seen.values()).sort((a, b) => a.distanceMeters - b.distanceMeters);

    const stationModes = new Set(["train", "rer", "metro", "métro/RER"]);
    const stations = stops.filter((s) => stationModes.has(s.mode));
    const regularStops = stops.filter((s) => !stationModes.has(s.mode));

    // Comptés sur les listes entières, avant la troncature à 5, et sur la vraie distance :
    // la requête porte sur un carré, dont les coins dépassent le rayon de 41 %. Les entrées
    // qui désignent le même lieu sous d'autres noms sont regroupées (`sameStation`,
    // `sameStop`) ; les listes affichées, elles, restent celles d'avant.
    const withinCount = (list: LocatedStop[]) => list.filter((s) => s.distanceMeters <= countRadiusMeters);
    // Les coordonnées ne servent qu'au regroupement : elles ne sortent pas du provider.
    const toDto = ({ id, name, distanceMeters, mode }: LocatedStop) => ({ id, name, distanceMeters, mode });

    return {
      nearestStops: regularStops.slice(0, 5).map(toDto),
      nearestStations: stations.slice(0, 5).map(toDto),
      counts: {
        radiusMeters: countRadiusMeters,
        stops: countSites(withinCount(regularStops), sameStop),
        stations: countSites(withinCount(stations), sameStation),
      },
    };
  }

  private inferMode(feature: GtfsStopFeature): string {
    const title = feature.properties.dataset_title.toLowerCase();
    const name = feature.properties.stop_name.toLowerCase();
    const isIdf =
      title.includes("idfm") || title.includes("île-de-france") || title.includes("transilien");

    const isRailDataset =
      title.includes("sncf") || title.includes("transilien") || /\bter\b/.test(title);

    // Détection par nom : couvre les datasets régionaux qui n'ont pas
    // "sncf"/"ter" dans leur titre mais incluent quand même des gares
    // (ex. "Agrégat des réseaux ... de Nouvelle Aquitaine" → "Gare St Jean").
    // Filtres anti-faux-positifs :
    //  - "gare routière" = gare bus, pas train
    //  - noms de rues / places contenant "gare" (rue de la gare, place de la gare…)
    const looksLikeStation =
      feature.properties.location_type === 1 &&
      /\bgare\b/.test(name) &&
      !name.includes("/") &&
      !name.includes("gare routière") &&
      !/^(rue|avenue|av\.|place|boulevard|bd\.|chemin|impasse|allée|cours)\b/i.test(name);

    if (isRailDataset) {
      // SNCF Transilien includes all IDFM stations (metro, RER, train) without distinction.
      // Only location_type=1 with simple names (no "/") are real stations.
      // Names with "/" like "République - La Poste / Ecole Militaire" are bus hubs.
      if (feature.properties.location_type === 1 && !name.includes("/")) {
        // In Île-de-France, we can't distinguish metro from RER from train
        return isIdf ? "métro/RER" : "train";
      }
      return "bus";
    }

    if (looksLikeStation) {
      return isIdf ? "métro/RER" : "train";
    }

    if (isIdf) {
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
}
