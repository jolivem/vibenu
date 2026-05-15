import { InMemoryCache } from "../../../server-shared/infrastructure/cache/in-memory-cache";
import { query } from "../../../server-shared/infrastructure/database/postgres";
import type { GeoJsonGeometryDto } from "../../../server-shared/types/location-analysis.dto";

const HUNDRED_DAYS = 100 * 24 * 60 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 5 * 60 * 1000; // 5 min
const FETCH_TIMEOUT_MS = 4000;

interface GeoApiCommuneFeature {
  type: "Feature";
  geometry: GeoJsonGeometryDto;
  properties: Record<string, unknown>;
}

interface ContourCacheRow {
  geometry: GeoJsonGeometryDto | null;
}

export class CommuneContourProvider {
  /** Cache mémoire (100 jours) — fast path, évite la BDD pour les requêtes répétées. */
  private static memoryCache = new InMemoryCache<GeoJsonGeometryDto | null>(HUNDRED_DAYS);
  /** Cooldown sur les échecs (5 min) — évite de re-taper une API en panne à chaque visite. */
  private static failureCooldown = new Map<string, number>();
  /** Singleflight : si une requête est déjà en cours pour ce citycode, on attend son résultat. */
  private static inflight = new Map<string, Promise<GeoJsonGeometryDto | null>>();
  private readonly baseUrl = "https://geo.api.gouv.fr";

  async getContour(citycode: string): Promise<GeoJsonGeometryDto | null> {
    // 1. Cache mémoire
    const cached = CommuneContourProvider.memoryCache.get(citycode);
    if (cached !== undefined) return cached;

    // 2. Cooldown sur échec récent → on n'inonde pas l'API en panne
    const cooldownExpiry = CommuneContourProvider.failureCooldown.get(citycode);
    if (cooldownExpiry && Date.now() < cooldownExpiry) {
      return null;
    }

    // 3. Singleflight : une seule requête simultanée par citycode
    const existing = CommuneContourProvider.inflight.get(citycode);
    if (existing) return existing;

    const promise = this.resolveContour(citycode).finally(() => {
      CommuneContourProvider.inflight.delete(citycode);
    });
    CommuneContourProvider.inflight.set(citycode, promise);
    return promise;
  }

  /** DB cache → API. */
  private async resolveContour(citycode: string): Promise<GeoJsonGeometryDto | null> {
    const persisted = await this.readFromDb(citycode);
    if (persisted !== undefined) {
      CommuneContourProvider.memoryCache.set(citycode, persisted);
      return persisted;
    }

    const fromApi = await this.fetchFromApi(citycode);
    if (fromApi !== undefined) {
      CommuneContourProvider.memoryCache.set(citycode, fromApi);
      await this.writeToDb(citycode, fromApi);
      return fromApi;
    }

    // Échec API → cooldown mémoire, pas de persistance.
    CommuneContourProvider.failureCooldown.set(citycode, Date.now() + FAILURE_COOLDOWN_MS);
    return null;
  }

  /**
   * undefined  → pas en BDD (jamais fetché)
   * null       → fetché, l'API n'avait pas de géométrie (à mémoriser)
   * GeoJSON    → contour persisté
   */
  private async readFromDb(citycode: string): Promise<GeoJsonGeometryDto | null | undefined> {
    try {
      const rows = await query<ContourCacheRow>(
        `SELECT geometry FROM commune_contour_cache WHERE citycode = $1`,
        [citycode],
      );
      if (rows.length === 0) return undefined;
      return rows[0].geometry;
    } catch (error) {
      console.warn(`commune_contour_cache read error for ${citycode}:`, error);
      return undefined;
    }
  }

  private async writeToDb(citycode: string, geometry: GeoJsonGeometryDto | null): Promise<void> {
    try {
      await query(
        `INSERT INTO commune_contour_cache (citycode, geometry, fetched_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (citycode) DO UPDATE SET
           geometry = EXCLUDED.geometry,
           fetched_at = EXCLUDED.fetched_at`,
        [citycode, geometry === null ? null : JSON.stringify(geometry)],
      );
    } catch (error) {
      console.warn(`commune_contour_cache write error for ${citycode}:`, error);
    }
  }

  /**
   * undefined → erreur réseau / timeout / non-200 (déclenchera un cooldown).
   * GeoJSON | null → réponse API valide (à mémoriser, y compris pour le null).
   */
  private async fetchFromApi(citycode: string): Promise<GeoJsonGeometryDto | null | undefined> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(
        `${this.baseUrl}/communes/${citycode}?format=geojson&geometry=contour`,
        { headers: { Accept: "application/json" }, signal: controller.signal },
      );
      if (!response.ok) {
        console.warn(`Commune contour API error: ${response.status} for ${citycode}`);
        return undefined;
      }
      const data = (await response.json()) as GeoApiCommuneFeature;
      return data.geometry ?? null;
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "AbortError";
      console.warn(
        `Commune contour fetch ${isTimeout ? "timeout" : "error"} for ${citycode}:`,
        isTimeout ? `>${FETCH_TIMEOUT_MS}ms` : error,
      );
      return undefined;
    } finally {
      clearTimeout(timer);
    }
  }
}
