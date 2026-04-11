"use client";

import { useEffect, useState } from "react";
import { backendApi } from "@/lib/api/backend-api";
import type { AddressSuggestionDto } from "@/types/location-analysis";

export const useAddressSearch = (query: string) => {
  const [results, setResults] = useState<AddressSuggestionDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await backendApi.searchAddress(query);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue.");
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  return { results, isLoading, error };
};
