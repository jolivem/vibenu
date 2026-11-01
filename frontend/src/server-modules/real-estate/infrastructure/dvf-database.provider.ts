import type { RealEstateProvider, RealEstateMarketData } from "./real-estate.provider";
import type { DvfTransactionFeature, PropertyKind, PropertyKindMarket } from "../domain/real-estate.types";
import { groupByParcel, median, type LocatedSale } from "../application/dvfBuildings";
import { query } from "../../../server-shared/infrastructure/database/postgres";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";

const ONE_DAY = 24 * 60 * 60 * 1000;
const SEVEN_DAYS = 7 * ONE_DAY;

/**
 * Nombre de millésimes retenus autour d'une adresse : les deux derniers publiés.
 *
 * Avec les cinq publiés (2021-2025), les 100 ventes les plus proches tenaient à Paris dans
 * une centaine de mètres — une poignée d'immeubles — et mêlaient des prix de 2021 aux prix
 * récents. Deux millésimes redonnent un voisinage (~200 m à Paris) et des prix actuels.
 */
const RECENT_YEARS = 2;

/**
 * Ventes retenues autour d'une adresse : les 50 plus proches, tous types confondus. Chaque
 * type de bien a ensuite sa médiane parmi elles — autant d'appartements et de maisons que
 * le voisinage en compte.
 */
const NEARBY_SALES = 50;

/** En dessous, pas de médiane pour le type : « 9 ventes de maisons », sans prix. */
export const MIN_SALES_FOR_MEDIAN = 10;

/** Type de bien de DVF (`type_local`) → clé du DTO. */
const KINDS: Record<PropertyKind, string> = { appartement: "Appartement", maison: "Maison" };

interface DvfRow {
  id_mutation: string;
  id_parcelle: string | null;
  date_mutation: string;
  valeur_fonciere: number;
  surface_bati: number;
  type_local: string;
  nb_logements: number | null;
  longitude: number;
  latitude: number;
  distance_meters: number;
  geojson: string | null;
}

// La date en texte : lue comme objet Date, minuit à Paris devenait la veille en UTC
// (`toISOString`), et chaque vente s'affichait un jour trop tôt (28/09 pour le 29/09/2025).
const COLUMNS = `id_mutation, id_parcelle, to_char(date_mutation, 'YYYY-MM-DD') AS date_mutation, valeur_fonciere, surface_bati, type_local,
                nb_logements, longitude, latitude, ST_AsGeoJSON(geometry) AS geojson`;

/**
 * Real estate provider using DVF data stored in PostgreSQL.
 * Parcel geometries come from cadastre (joined at import time).
 */
export class DvfDatabaseProvider implements RealEstateProvider {
  private static cache = new InMemoryCache<RealEstateMarketData>(SEVEN_DAYS);
  private static latestYearCache = new InMemoryCache<number>(ONE_DAY);

  /** Dernier millésime présent en base, lu par l'index sur la date. */
  private async latestYear(): Promise<number> {
    const cached = DvfDatabaseProvider.latestYearCache.get("latest");
    if (cached) return cached;
    const rows = await query<{ year: number | null }>(
      `SELECT EXTRACT(YEAR FROM MAX(date_mutation))::int AS year FROM dvf_transactions`,
    );
    const year = rows[0]?.year ?? new Date().getFullYear() - 1;
    DvfDatabaseProvider.latestYearCache.set("latest", year);
    return year;
  }

  async getNearbyTransactions(lat: number, lon: number, radiusMeters: number) {
    const cacheKey = buildGeoKey(lat, lon);
    const cached = DvfDatabaseProvider.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const to = await this.latestYear();
      const from = to - RECENT_YEARS + 1;
      const rows = await query<DvfRow>(
        `SELECT ${COLUMNS},
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
           AND date_mutation >= make_date($4, 1, 1)
           AND valeur_fonciere > 0
           AND surface_bati > 0
         ORDER BY distance_meters ASC
         LIMIT $5`,
        [lon, lat, radiusMeters, from, NEARBY_SALES],
      );

      if (rows.length === 0) {
        return this.getFallbackData();
      }

      const result = this.analyzeTransactions(rows, { from, to });
      DvfDatabaseProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("DVF database provider error:", error);
      return this.getFallbackData();
    }
  }

  async getCommuneTransactions(codeInsee: string) {
    const cacheKey = `commune:${codeInsee}`;
    const cached = DvfDatabaseProvider.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const rows = await query<DvfRow>(
        `SELECT ${COLUMNS}, 0 AS distance_meters
         FROM dvf_transactions
         WHERE code_commune = $1
           AND date_mutation >= NOW() - INTERVAL '10 years'
           AND valeur_fonciere > 0
           AND surface_bati > 0
         ORDER BY date_mutation DESC
         LIMIT 500`,
        [codeInsee],
      );

      if (rows.length === 0) {
        return this.getFallbackData();
      }

      const result = this.analyzeTransactions(rows, null);
      // Pas de distance en mode commune : les immeubles les plus vendus d'abord.
      result.buildings?.sort((a, b) => b.sales.length - a.sales.length);
      DvfDatabaseProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("DVF database provider (commune) error:", error);
      return this.getFallbackData();
    }
  }

  private analyzeTransactions(rows: DvfRow[], period: { from: number; to: number } | null): RealEstateMarketData {
    const sales: LocatedSale[] = [];

    for (const row of rows) {
      const price = Number(row.valeur_fonciere);
      const surface = Number(row.surface_bati);
      if (!price || !surface || surface <= 0) continue;

      const pricePerSqm = price / surface;
      if (pricePerSqm <= 0 || pricePerSqm >= 50_000) continue;

      const date = String(row.date_mutation);

      sales.push({
        saleId: row.id_mutation,
        parcelId: row.id_parcelle,
        distanceMeters: Number(row.distance_meters),
        geometry: this.parseGeometry(row),
        date,
        propertyType: String(row.type_local),
        surface: Math.round(surface),
        price: Math.round(price),
        pricePerSqm: Math.round(pricePerSqm),
        exactPricePerSqm: pricePerSqm,
        dwellings: row.nb_logements == null ? null : Number(row.nb_logements),
      });
    }

    if (sales.length === 0) {
      return this.getFallbackData();
    }

    const { buildings, features } = groupByParcel(sales);
    const market = (kind: PropertyKind) => this.kindMarket(sales.filter((s) => s.propertyType === KINDS[kind]));

    return {
      nearbyTransactionsCount: sales.length,
      markets: { appartement: market("appartement"), maison: market("maison") },
      ...(period
        ? { period, radiusMeters: Math.ceil(Math.max(...sales.map((s) => s.distanceMeters))) }
        : {}),
      transactionFeatures: features,
      buildings,
    };
  }

  /**
   * Le marché d'un type : médiane des €/m² non arrondis (scripts/verify la recalcule ainsi
   * depuis les fichiers publics). `null` sans aucune vente.
   */
  private kindMarket(sales: LocatedSale[]): PropertyKindMarket | null {
    if (sales.length === 0) return null;
    return {
      count: sales.length,
      medianPricePerSqm:
        sales.length >= MIN_SALES_FOR_MEDIAN ? Math.round(median(sales.map((s) => s.exactPricePerSqm))) : null,
    };
  }

  /** Contour cadastral de la parcelle, ou un petit carré autour du point à défaut. */
  private parseGeometry(row: DvfRow): DvfTransactionFeature["geometry"] {
    if (row.geojson) {
      try {
        const parsed = JSON.parse(row.geojson);
        if (parsed.type === "Polygon" || parsed.type === "MultiPolygon") return parsed;
      } catch {
        // Contour illisible : le carré ci-dessous.
      }
    }
    return this.buildSquareGeometry(Number(row.longitude), Number(row.latitude));
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

  private getFallbackData(): RealEstateMarketData {
    return {
      nearbyTransactionsCount: 0,
      markets: { appartement: null, maison: null },
      transactionFeatures: [],
      buildings: [],
    };
  }
}
