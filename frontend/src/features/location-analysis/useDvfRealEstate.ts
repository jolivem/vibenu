"use client";

import { useEffect, useState } from "react";
import type {
  RealEstateAnalysisDto,
  DvfTransactionFeatureDto,
} from "@/types/location-analysis";

const DVF_API_URL =
  "https://apidf-preprod.cerema.fr/dvf_opendata/geomutations";

interface DvfMutationProperties {
  idmutinvar: string;
  datemut: string;
  anneemut: number;
  valeurfonc: string;
  sbati: string;
  libtypbien: string;
  libnatmut: string;
  nblocmut: number;
  sterr: string;
  l_codinsee: string[];
}

interface DvfGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
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

function analyzeTransactions(
  features: DvfFeature[],
  centerLat: number,
  centerLon: number,
): RealEstateAnalysisDto {
  const fallback: RealEstateAnalysisDto = {
    nearbyTransactionsCount: 0,
    priceLevel: "moyen",
    confidence: "faible",
    score: 50,
    medianPricePerSquareMeter: 0,
    transactionFeatures: [],
  };

  if (features.length === 0) return fallback;

  const sales = features.filter((f) => {
    const type = f.properties.libtypbien.toLowerCase();
    const nature = f.properties.libnatmut.toLowerCase();
    return (
      nature.includes("vente") &&
      (type.includes("appartement") || type.includes("maison"))
    );
  });

  if (sales.length === 0) return fallback;

  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const recent = sales.filter(
    (f) => new Date(f.properties.datemut) >= threeYearsAgo,
  );
  const pool = recent.length > 0 ? recent : sales;

  const pricesPerSqm = pool
    .map((f) => {
      const price = parseFloat(f.properties.valeurfonc);
      const surface = parseFloat(f.properties.sbati);
      if (!price || !surface || surface <= 0) return null;
      return price / surface;
    })
    .filter((p): p is number => p !== null && p > 0 && p < 50_000)
    .sort((a, b) => a - b);

  if (pricesPerSqm.length === 0) return fallback;

  const median = pricesPerSqm[Math.floor(pricesPerSqm.length / 2)];

  let priceLevel: "faible" | "moyen" | "élevé" = "moyen";
  if (median < 2500) priceLevel = "faible";
  else if (median > 5000) priceLevel = "élevé";

  let confidence: "faible" | "moyenne" | "élevée" = "faible";
  if (pool.length >= 10) confidence = "moyenne";
  if (pool.length >= 50) confidence = "élevée";

  // Score (same logic as server-side RealEstateServiceImpl)
  let score = 50;
  if (pool.length >= 10) score += 15;
  if (confidence === "élevée") score += 10;
  if (priceLevel === "moyen") score += 10;
  if (priceLevel === "élevé") score += 5;
  score = Math.min(score, 100);

  const transactionFeatures = buildTransactionFeatures(
    pool,
    centerLat,
    centerLon,
  );

  return {
    nearbyTransactionsCount: pool.length,
    priceLevel,
    confidence,
    score,
    medianPricePerSquareMeter: Math.round(median),
    transactionFeatures,
  };
}

function computeCentroid(geometry: DvfGeometry): [number, number] {
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

function buildTransactionFeatures(
  pool: DvfFeature[],
  centerLat: number,
  centerLon: number,
): DvfTransactionFeatureDto[] {
  const features: Array<DvfTransactionFeatureDto & { _distance: number }> = [];

  for (const f of pool) {
    if (!f.geometry) continue;

    const price = parseFloat(f.properties.valeurfonc);
    const surface = parseFloat(f.properties.sbati);
    if (!price || !surface || surface <= 0) continue;

    const pricePerSqm = price / surface;
    if (pricePerSqm <= 0 || pricePerSqm >= 50_000) continue;

    const centroid = computeCentroid(f.geometry);
    const distance = Math.hypot(
      centroid[0] - centerLon,
      centroid[1] - centerLat,
    );

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

export function useDvfRealEstate(lat?: number, lon?: number) {
  const [data, setData] = useState<RealEstateAnalysisDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof lat !== "number" || typeof lon !== "number") return;

    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const threeYearsAgo = new Date().getFullYear() - 3;
        const delta = 0.005;
        const url = `${DVF_API_URL}/?in_bbox=${lon - delta},${lat - delta},${lon + delta},${lat + delta}&anneemut_min=${threeYearsAgo}&page_size=100`;

        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (!response.ok) {
          console.warn(`DVF API error: ${response.status} ${response.statusText}`);
          setError(true);
          return;
        }

        const json = (await response.json()) as DvfResponse;
        setData(analyzeTransactions(json.features, lat, lon));
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("DVF client-side error:", err);
          setError(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void load();

    return () => controller.abort();
  }, [lat, lon]);

  return { dvfData: data, dvfLoading: isLoading, dvfError: error };
}
