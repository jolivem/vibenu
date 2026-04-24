"use client";

import { useEffect, useState } from "react";
import { backendApi } from "@/lib/api/backend-api";
import type { LocationAnalysisDto, NarrativeDto } from "@/types/location-analysis";

export function useNarrative(data: LocationAnalysisDto | null) {
  const [narrative, setNarrative] = useState<NarrativeDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    backendApi
      .generateNarrative(data)
      .then((result) => {
        if (!cancelled) setNarrative(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur inconnue.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data]);

  return { narrative, isLoading, error };
}
