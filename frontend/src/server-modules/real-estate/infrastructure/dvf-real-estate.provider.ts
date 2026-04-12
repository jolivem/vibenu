import type { RealEstateProvider } from "./real-estate.provider";
import type { DvfTransactionFeature } from "../domain/real-estate.types";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

interface DvfGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

interface DvfMutationProperties {
  idmutinvar: string;
  datemut: string;        // "YYYY-MM-DD"
  anneemut: number;
  valeurfonc: string;     // e.g. "170000.00"
  sbati: string;          // surface bâtie m², e.g. "15.00"
  libtypbien: string;     // "UN APPARTEMENT", "UNE MAISON", etc.
  libnatmut: string;      // "Vente", "Vente en l'état futur d'achèvement", etc.
  nblocmut: number;
  sterr: string;          // surface terrain
  l_codinsee: string[];
}

interface DvfFeature {
  id: number;
  type: "Feature";
  geometry: DvfGeometry | null;
  properties: DvfMutationProperties;
}

interface DvfResponse {
  type: "FeatureCollection";
  count: number;
  next: string | null;
  features: DvfFeature[];
}

/**
 * Real estate provider using DVF (Demandes de Valeurs Foncières) via Cerema API
 * Fetches actual property transactions from the French open dataset
 * API: https://apidf-preprod.cerema.fr/dvf_opendata/geomutations/
 */
export class DvfRealEstateProvider implements RealEstateProvider {
  private static cache = new InMemoryCache<{
    nearbyTransactionsCount: number;
    priceLevel: "faible" | "moyen" | "élevé";
    confidence: "faible" | "moyenne" | "élevée";
    medianPricePerSquareMeter: number;
    transactionFeatures: DvfTransactionFeature[];
  }>(SEVEN_DAYS);
  private readonly dvfApiUrl = "https://apidf-preprod.cerema.fr/dvf_opendata/geomutations";

  async getNearbyTransactions(lat: number, lon: number, _radiusMeters: number, codeInsee?: string) {
    const cacheKey = buildGeoKey(lat, lon);
    const cached = DvfRealEstateProvider.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Always use bbox for geographic proximity — INSEE code returns random order across the whole commune
      const threeYearsAgo = new Date().getFullYear() - 3;
      const delta = 0.005; // ~500m
      const url = `${this.dvfApiUrl}/?in_bbox=${lon - delta},${lat - delta},${lon + delta},${lat + delta}&anneemut_min=${threeYearsAgo}&page_size=100`;

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        console.warn(`DVF API error: ${response.status} ${response.statusText}`);
        return this.getFallbackData();
      }

      const data = (await response.json()) as DvfResponse;
      const result = this.analyzeTransactions(data.features, lat, lon);
      DvfRealEstateProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("DVF provider error:", error);
      return this.getFallbackData();
    }
  }

  private analyzeTransactions(features: DvfFeature[], centerLat: number, centerLon: number) {
    if (features.length === 0) {
      return this.getFallbackData();
    }

    // Filter: only sales of apartments/houses
    const sales = features.filter((f) => {
      const type = f.properties.libtypbien.toLowerCase();
      const nature = f.properties.libnatmut.toLowerCase();
      return (
        nature.includes("vente") &&
        (type.includes("appartement") || type.includes("maison"))
      );
    });

    if (sales.length === 0) {
      return this.getFallbackData();
    }

    // Keep only recent transactions (last 3 years)
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const recent = sales.filter((f) => new Date(f.properties.datemut) >= threeYearsAgo);
    const pool = recent.length > 0 ? recent : sales;

    // Calculate price per m²
    const pricesPerSqm = pool
      .map((f) => {
        const price = parseFloat(f.properties.valeurfonc);
        const surface = parseFloat(f.properties.sbati);
        if (!price || !surface || surface <= 0) return null;
        return price / surface;
      })
      .filter((p): p is number => p !== null && p > 0 && p < 50_000) // filter outliers
      .sort((a, b) => a - b);

    if (pricesPerSqm.length === 0) {
      return this.getFallbackData();
    }

    const median = pricesPerSqm[Math.floor(pricesPerSqm.length / 2)];

    let priceLevel: "faible" | "moyen" | "élevé" = "moyen";
    if (median < 2500) priceLevel = "faible";
    else if (median > 5000) priceLevel = "élevé";

    let confidence: "faible" | "moyenne" | "élevée" = "faible";
    if (pool.length >= 10) confidence = "moyenne";
    if (pool.length >= 50) confidence = "élevée";

    // Build map features: filter to valid geometry + price, sort by distance, take 50
    const transactionFeatures = this.buildTransactionFeatures(pool, centerLat, centerLon);

    return {
      nearbyTransactionsCount: pool.length,
      priceLevel,
      confidence,
      medianPricePerSquareMeter: Math.round(median),
      transactionFeatures,
    };
  }

  private buildTransactionFeatures(
    pool: DvfFeature[],
    centerLat: number,
    centerLon: number,
  ): DvfTransactionFeature[] {
    const features: Array<DvfTransactionFeature & { _distance: number }> = [];

    for (const f of pool) {
      if (!f.geometry) continue;

      const price = parseFloat(f.properties.valeurfonc);
      const surface = parseFloat(f.properties.sbati);
      if (!price || !surface || surface <= 0) continue;

      const pricePerSqm = price / surface;
      if (pricePerSqm <= 0 || pricePerSqm >= 50_000) continue;

      const centroid = this.computeCentroid(f.geometry);
      const distance = Math.hypot(centroid[0] - centerLon, centroid[1] - centerLat);

      features.push({
        type: "Feature",
        geometry: f.geometry,
        properties: {
          pricePerSqm: Math.round(pricePerSqm),
          price: Math.round(price),
          surface: Math.round(surface),
          date: f.properties.datemut,
          propertyType: f.properties.libtypbien,
        },
        _distance: distance,
      });
    }

    features.sort((a, b) => a._distance - b._distance);

    return features.slice(0, 50).map(({ _distance, ...feature }) => feature);
  }

  private computeCentroid(geometry: DvfGeometry): [number, number] {
    // Get the first ring of the first polygon
    const coords =
      geometry.type === "MultiPolygon"
        ? (geometry.coordinates as number[][][][])[0][0]
        : (geometry.coordinates as number[][][])[0];

    let sumLon = 0;
    let sumLat = 0;
    for (const [lon, lat] of coords) {
      sumLon += lon;
      sumLat += lat;
    }
    return [sumLon / coords.length, sumLat / coords.length];
  }

  private getFallbackData() {
    return {
      nearbyTransactionsCount: 0,
      priceLevel: "moyen" as const,
      confidence: "faible" as const,
      medianPricePerSquareMeter: 0,
      transactionFeatures: [],
    };
  }
}
