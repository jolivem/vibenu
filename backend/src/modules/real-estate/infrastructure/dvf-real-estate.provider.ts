import type { RealEstateProvider } from "./real-estate.provider.js";

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
  geometry: unknown;
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
  private readonly dvfApiUrl = "https://apidf-preprod.cerema.fr/dvf_opendata/geomutations";

  async getNearbyTransactions(lat: number, lon: number, _radiusMeters: number, codeInsee?: string) {
    try {
      let url: string;
      if (codeInsee) {
        // Query by INSEE code — most reliable
        url = `${this.dvfApiUrl}/?code_insee=${codeInsee}&page_size=100`;
      } else {
        // Fallback: query by lat/lon bounding box
        const delta = 0.005; // ~500m
        url = `${this.dvfApiUrl}/?in_bbox=${lon - delta},${lat - delta},${lon + delta},${lat + delta}&page_size=100`;
      }

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        console.warn(`DVF API error: ${response.status} ${response.statusText}`);
        return this.getFallbackData();
      }

      const data = (await response.json()) as DvfResponse;
      return this.analyzeTransactions(data.features);
    } catch (error) {
      console.error("DVF provider error:", error);
      return this.getFallbackData();
    }
  }

  private analyzeTransactions(features: DvfFeature[]) {
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

    return {
      nearbyTransactionsCount: pool.length,
      priceLevel,
      confidence,
      medianPricePerSquareMeter: Math.round(median),
    };
  }

  private getFallbackData() {
    return {
      nearbyTransactionsCount: 0,
      priceLevel: "moyen" as const,
      confidence: "faible" as const,
      medianPricePerSquareMeter: 0,
    };
  }
}
