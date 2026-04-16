import type { RealEstateProvider } from "./real-estate.provider";
import type { DvfTransactionFeature } from "../domain/real-estate.types";
import type { ConfidenceLevel, PriceLevel } from "../../../server-shared/domain/common.types";
import { query } from "../../../server-shared/infrastructure/database/neon";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

interface DvfRow {
  id_mutation: string;
  date_mutation: string | Date;
  valeur_fonciere: number;
  surface_bati: number;
  type_local: string;
  longitude: number;
  latitude: number;
  distance_meters: number;
  geojson: string | null;
}

interface DvfResult {
  nearbyTransactionsCount: number;
  priceLevel: PriceLevel;
  confidence: ConfidenceLevel;
  medianPricePerSquareMeter: number;
  transactionFeatures: DvfTransactionFeature[];
}

/**
 * Real estate provider using DVF data stored in PostgreSQL.
 * Parcel geometries come from cadastre (joined at import time).
 */
export class DvfDatabaseProvider implements RealEstateProvider {
  private static cache = new InMemoryCache<DvfResult>(SEVEN_DAYS);

  async getNearbyTransactions(lat: number, lon: number, radiusMeters: number) {
    const cacheKey = buildGeoKey(lat, lon);
    const cached = DvfDatabaseProvider.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const rows = await query<DvfRow>(
        `SELECT id_mutation, date_mutation, valeur_fonciere, surface_bati, type_local,
                longitude, latitude,
                ST_AsGeoJSON(geometry) AS geojson,
                ST_Distance(
                  ST_MakePoint(longitude, latitude)::geography,
                  ST_MakePoint($1, $2)::geography
                ) AS distance_meters
         FROM dvf_transactions
         WHERE ST_DWithin(
                  ST_MakePoint(longitude, latitude)::geography,
                  ST_MakePoint($1, $2)::geography,
                  $3
               )
           AND date_mutation >= NOW() - INTERVAL '10 years'
           AND valeur_fonciere > 0
           AND surface_bati > 0
         ORDER BY distance_meters ASC
         LIMIT 100`,
        [lon, lat, radiusMeters],
      );

      if (rows.length === 0) {
        return this.getFallbackData();
      }

      const result = this.analyzeTransactions(rows);
      DvfDatabaseProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("DVF database provider error:", error);
      return this.getFallbackData();
    }
  }

  private analyzeTransactions(rows: DvfRow[]): DvfResult {
    const pricesPerSqm: number[] = [];
    const features: DvfTransactionFeature[] = [];

    for (const row of rows) {
      const price = Number(row.valeur_fonciere);
      const surface = Number(row.surface_bati);
      if (!price || !surface || surface <= 0) continue;

      const pricePerSqm = price / surface;
      if (pricePerSqm <= 0 || pricePerSqm >= 50_000) continue;

      pricesPerSqm.push(pricePerSqm);

      const date = row.date_mutation instanceof Date
        ? row.date_mutation.toISOString().split("T")[0]
        : String(row.date_mutation);

      // Use real cadastre geometry (Polygon/MultiPolygon) if available, fallback to small square
      let geometry: DvfTransactionFeature["geometry"];
      if (row.geojson) {
        try {
          const parsed = JSON.parse(row.geojson);
          if (parsed.type === "Polygon" || parsed.type === "MultiPolygon") {
            geometry = parsed;
          } else {
            geometry = this.buildSquareGeometry(Number(row.longitude), Number(row.latitude));
          }
        } catch {
          geometry = this.buildSquareGeometry(Number(row.longitude), Number(row.latitude));
        }
      } else {
        geometry = this.buildSquareGeometry(Number(row.longitude), Number(row.latitude));
      }

      features.push({
        type: "Feature",
        geometry,
        properties: {
          pricePerSqm: Math.round(pricePerSqm),
          price: Math.round(price),
          surface: Math.round(surface),
          date,
          propertyType: String(row.type_local),
        },
      });
    }

    if (pricesPerSqm.length === 0) {
      return this.getFallbackData();
    }

    pricesPerSqm.sort((a, b) => a - b);
    const median = pricesPerSqm[Math.floor(pricesPerSqm.length / 2)];

    let priceLevel: PriceLevel = "moyen";
    if (median < 2500) priceLevel = "faible";
    else if (median > 5000) priceLevel = "élevé";

    let confidence: ConfidenceLevel = "faible";
    if (pricesPerSqm.length >= 10) confidence = "moyenne";
    if (pricesPerSqm.length >= 50) confidence = "élevée";

    return {
      nearbyTransactionsCount: pricesPerSqm.length,
      priceLevel,
      confidence,
      medianPricePerSquareMeter: Math.round(median),
      transactionFeatures: features.slice(0, 50),
    };
  }

  private buildSquareGeometry(lon: number, lat: number): DvfTransactionFeature["geometry"] {
    const delta = 0.0001;
    return {
      type: "Polygon",
      coordinates: [[
        [lon - delta, lat - delta],
        [lon + delta, lat - delta],
        [lon + delta, lat + delta],
        [lon - delta, lat + delta],
        [lon - delta, lat - delta],
      ]],
    };
  }

  private getFallbackData(): DvfResult {
    return {
      nearbyTransactionsCount: 0,
      priceLevel: "moyen",
      confidence: "faible",
      medianPricePerSquareMeter: 0,
      transactionFeatures: [],
    };
  }
}
