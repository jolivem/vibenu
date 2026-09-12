"use client";

import { useEffect, useState } from "react";
import { backendApi } from "@/lib/api/backend-api";
import type { CardInsights, LocationAnalysisDto, SecurityRating } from "@/types/location-analysis";

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
 *
 * Le même appel rend la note de sécurité du bandeau de chiffres clés. Elle arrive donc
 * après les autres tuiles, qui sont tirées du DTO d'analyse : la tuile « Sécurité »
 * s'insère à sa place dans la rangée quand la réponse arrive.
 */
export function useCardInsights(data: LocationAnalysisDto | null, citycode?: string) {
  const [insights, setInsights] = useState<CardInsights>({});
  /** `undefined` tant que l'appel n'a pas rendu, et définitivement si le modèle n'a pas
   *  produit de note exploitable : la tuile du bandeau n'apparaît alors pas. */
  const [securityRating, setSecurityRating] = useState<SecurityRating | undefined>(undefined);
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
        setSecurityRating(result.securityRating);
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

  return { insights, securityRating, isLoading, debugInput };
}
