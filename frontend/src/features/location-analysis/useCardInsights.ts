"use client";

import { useEffect, useState } from "react";
import { backendApi } from "@/lib/api/backend-api";
import type { CardInsights, LocationAnalysisDto } from "@/types/location-analysis";

/**
 * Charge les mini-synthèses une fois l'analyse arrivée.
 *
 * Second temps délibéré : l'écran est complet dès que `data` est là, et les phrases
 * s'insèrent ensuite sous les titres. Faire attendre l'analyse pour un commentaire
 * reviendrait à retarder la donnée pour son résumé.
 *
 * Pas d'état d'erreur exposé : il n'y a plus aucune UI d'erreur à alimenter. Une
 * génération ratée laisse `insights` vide, et la page est celle d'avant la
 * fonctionnalité — un objet vide plutôt que `null`, pour que les sept sites d'appel
 * puissent y accéder sans garde.
 */
export function useCardInsights(data: LocationAnalysisDto | null, citycode?: string) {
  const [insights, setInsights] = useState<CardInsights>({});
  const [isLoading, setIsLoading] = useState(false);
  const [debugInput, setDebugInput] = useState<unknown>(undefined);

  useEffect(() => {
    if (!data) return;

    let cancelled = false;
    setIsLoading(true);

    backendApi
      .generateCardInsights(data, citycode)
      .then((result) => {
        if (cancelled) return;
        setInsights(result.insights);
        setDebugInput(result.debugInput);
      })
      .catch((err) => {
        if (!cancelled) console.warn("Card insights unavailable:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data, citycode]);

  return { insights, isLoading, debugInput };
}
