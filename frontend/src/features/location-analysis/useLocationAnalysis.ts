"use client";

import { useEffect, useState } from "react";
import { backendApi } from "@/lib/api/backend-api";
import type { LocationAnalysisDto } from "@/types/location-analysis";

export const useLocationAnalysis = (input: {
  lat?: number;
  lon?: number;
  label?: string;
  city?: string;
  postcode?: string;
}) => {
  const [data, setData] = useState<LocationAnalysisDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof input.lat !== "number" || typeof input.lon !== "number") return;

    const { lat, lon } = input;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const analysis = await backendApi.analyzeLocation({
          lat,
          lon,
          label: input.label,
          city: input.city,
          postcode: input.postcode,
        });
        setData(analysis);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue.");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [input.city, input.label, input.lat, input.lon, input.postcode]);

  return { data, isLoading, error };
};
