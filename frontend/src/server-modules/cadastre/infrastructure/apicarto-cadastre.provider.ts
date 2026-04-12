import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";
import type {
  CadastreAnalysis,
  CadastreParcel,
  GeoJsonGeometry,
  UrbanZone,
  UrbanPrescription,
} from "../domain/cadastre.types";
import type { CadastreProvider } from "./cadastre.provider";

interface ApiCartoFeature {
  type: "Feature";
  geometry: GeoJsonGeometry;
  properties: Record<string, unknown>;
}

interface ApiCartoResponse {
  type: "FeatureCollection";
  features: ApiCartoFeature[];
}

/**
 * Cadastre & urbanisme provider using IGN API Carto
 * - Parcelle: GET /api/cadastre/parcelle?geom={GeoJSON}
 * - Zone PLU: GET /api/gpu/zone-urba?geom={GeoJSON Point}
 * - Prescriptions: GET /api/gpu/prescription-surf?geom={GeoJSON Point}
 * https://apicarto.ign.fr/api/doc/cadastre
 * https://apicarto.ign.fr/api/doc/gpu
 */
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export class ApiCartoCadastreProvider implements CadastreProvider {
  private static cache = new InMemoryCache<CadastreAnalysis>(SEVEN_DAYS);
  private readonly baseUrl = "https://apicarto.ign.fr/api";

  async getCadastreData(lat: number, lon: number): Promise<CadastreAnalysis> {
    const cacheKey = buildGeoKey(lat, lon);
    const cached = ApiCartoCadastreProvider.cache.get(cacheKey);
    if (cached) return cached;
    const [parcel, urbanZone, prescriptions] = await Promise.all([
      this.fetchParcel(lat, lon),
      this.fetchUrbanZone(lat, lon),
      this.fetchPrescriptions(lat, lon),
    ]);

    const result = { parcel, urbanZone, prescriptions };
    ApiCartoCadastreProvider.cache.set(cacheKey, result);
    return result;
  }

  private async fetchParcel(lat: number, lon: number): Promise<CadastreParcel | null> {
    try {
      // Build a tiny polygon (~2m) around the point — the API requires geometry intersection
      const delta = 0.00001;
      const geom = {
        type: "Polygon" as const,
        coordinates: [[
          [lon - delta, lat - delta],
          [lon + delta, lat - delta],
          [lon + delta, lat + delta],
          [lon - delta, lat + delta],
          [lon - delta, lat - delta],
        ]],
      };

      const url = `${this.baseUrl}/cadastre/parcelle?geom=${encodeURIComponent(JSON.stringify(geom))}`;
      const data = await this.fetchJson<ApiCartoResponse>(url);
      if (!data || data.features.length === 0) return null;

      const props = data.features[0].properties;
      return {
        section: props.section as string,
        numero: props.numero as string,
        contenance: props.contenance as number,
        commune: props.nom_com as string,
        codeInsee: props.code_insee as string,
        geometry: data.features[0].geometry,
      };
    } catch (error) {
      console.warn("API Carto cadastre/parcelle error:", error);
      return null;
    }
  }

  private async fetchUrbanZone(lat: number, lon: number): Promise<UrbanZone | null> {
    try {
      const point = JSON.stringify({ type: "Point", coordinates: [lon, lat] });
      const url = `${this.baseUrl}/gpu/zone-urba?geom=${encodeURIComponent(point)}`;
      const data = await this.fetchJson<ApiCartoResponse>(url);
      if (!data || data.features.length === 0) return null;

      const props = data.features[0].properties;
      return {
        code: props.libelle as string,
        label: props.libelong as string,
        type: props.typezone as string,
      };
    } catch (error) {
      console.warn("API Carto gpu/zone-urba error:", error);
      return null;
    }
  }

  private async fetchPrescriptions(lat: number, lon: number): Promise<UrbanPrescription[]> {
    try {
      const point = JSON.stringify({ type: "Point", coordinates: [lon, lat] });
      const url = `${this.baseUrl}/gpu/prescription-surf?geom=${encodeURIComponent(point)}`;
      const data = await this.fetchJson<ApiCartoResponse>(url);
      if (!data) return [];

      // Filter out prescriptions that are useless without a value
      // (e.g. "Hauteur plafond" with no height, article references, generic labels)
      const excludedPatterns = [
        /^secteur soumis à l'article/i,
        /^voie publique/i,
        /^hauteur plafond$/i,
      ];

      return data.features
        .map((f) => ({
          label: f.properties.libelle as string,
          type: f.properties.typepsc as string,
        }))
        .filter((p) => !excludedPatterns.some((re) => re.test(p.label)));
    } catch (error) {
      console.warn("API Carto gpu/prescription-surf error:", error);
      return [];
    }
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.warn(`API Carto error: ${response.status} for ${url}`);
      return null;
    }

    return (await response.json()) as T;
  }
}
