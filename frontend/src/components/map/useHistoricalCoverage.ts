"use client";

import { useEffect, useState } from "react";
import { type CoverageMap, probeHistoricalCoverage } from "./historicalCoverage";

/**
 * Interroge la couverture des couches historiques au lieu affiché.
 *
 * Rend une carte vide tant que la sonde n'a pas répondu, ce qui vaut « toutes les
 * époques » côté appelant : la frise s'affiche entière au premier rendu, puis les
 * époques sans donnée en disparaissent. L'inverse — masquer d'abord, révéler ensuite —
 * ferait apparaître les pastilles une à une sous le curseur, et pénaliserait les
 * quatre-vingt-dix pour cent des lieux qui sont couverts partout.
 *
 * La sonde est relancée à chaque changement de lieu, et la précédente abandonnée : sur
 * l'écran d'analyse, enchaîner deux adresses ne doit pas laisser la couverture de la
 * première décider de la frise de la seconde.
 */
export function useHistoricalCoverage(lon: number, lat: number, displayZoom: number): CoverageMap {
  const [coverage, setCoverage] = useState<CoverageMap>({});

  useEffect(() => {
    const controller = new AbortController();
    setCoverage({});

    probeHistoricalCoverage(lon, lat, displayZoom, controller.signal).then((result) => {
      if (!controller.signal.aborted) setCoverage(result);
    });

    return () => controller.abort();
  }, [lon, lat, displayZoom]);

  return coverage;
}
