"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { FIRST_OVERLAY_LAYER_ID } from "./Map";
import {
  HISTORICAL_ERAS,
  HISTORICAL_ERAS_BY_ID,
  historicalRasterSource,
  historicalSourceId,
} from "./historicalLayers";

/**
 * Pose une couche historique sur une carte existante, et bascule d'une époque à l'autre.
 *
 * Passe par `onReady` plutôt que par la prop `basemap` : changer `basemap` remplace le
 * style, ce qui détruit et reconstruit toute la carte. Ici on ajoute une source raster
 * à la carte en place, et le fond (l'ortho actuelle) reste dessous — c'est lui le terme
 * de comparaison.
 *
 * Stratégie d'ajout : **paresseux, puis conservé**. On crée la source la première fois
 * qu'une époque est choisie et on ne la retire plus ; les changements suivants ne sont
 * que des bascules de visibilité. Précharger les six coûterait plusieurs mégaoctets pour
 * une carte que l'utilisateur ne touchera peut-être pas, et retirer la source à chaque
 * clic jetterait son cache de tuiles — revenir sur une époque déjà vue re-téléchargerait
 * tout. `map.remove()` au démontage nettoie l'ensemble, il n'y a rien à libérer à la main.
 */
export function useHistoricalLayer(eraId: string | null, opacity: number) {
  const mapRef = useRef<MapLibreMap | null>(null);
  // Incrémenté quand une carte devient exploitable ; c'est ce qui relance l'effet
  // ci-dessous une fois le style chargé, et à nouveau si la carte est reconstruite.
  const [ready, setReady] = useState(0);

  const onMapReady = useCallback((map: MapLibreMap) => {
    mapRef.current = map;
    // `onReady` est appelé de façon synchrone après le constructeur : à cet instant le
    // style n'est pas chargé et `addSource` jetterait « Style is not done loading ».
    if (map.isStyleLoaded()) setReady((n) => n + 1);
    else map.once("style.load", () => setReady((n) => n + 1));
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    applyHistoricalEra(map, eraId, opacity);
  }, [eraId, opacity, ready]);

  return { onMapReady };
}

/**
 * Met la carte dans l'état demandé : l'époque `eraId` visible à l'opacité voulue, les
 * autres masquées, `null` ne laissant que le fond.
 *
 * Hors du hook pour être vérifiable sans navigateur : c'est la seule partie qui parle à
 * MapLibre, et la seule où une erreur passe inaperçue à la compilation.
 *
 * `opacity` est une fraction de 0 à 1, comme l'attend `raster-opacity`.
 */
export function applyHistoricalEra(
  map: MapLibreMap,
  eraId: string | null,
  opacity: number,
): void {
  const era = eraId === null ? null : HISTORICAL_ERAS_BY_ID.get(eraId);

  if (era) {
    const id = historicalSourceId(era.id);
    // Aucun état local des époques déjà posées : `onReady` peut refire sur une instance
    // neuve, ce qui rendrait faux tout suivi côté React. On demande à la carte, seule à
    // savoir ce qu'elle porte.
    if (!map.getSource(id)) {
      map.addSource(id, historicalRasterSource(era));
      map.addLayer(
        {
          id,
          type: "raster",
          source: id,
          // L'opacité est posée dès la création : sans elle, le calque apparaîtrait à
          // 100 % avant de sauter à la valeur réglée.
          paint: { "raster-opacity": opacity },
        },
        // Sous nos surcouches : le raster doit masquer le fond, pas le contour de
        // parcelle ni celui de la commune.
        map.getLayer(FIRST_OVERLAY_LAYER_ID) ? FIRST_OVERLAY_LAYER_ID : undefined,
      );
    } else {
      map.setPaintProperty(id, "raster-opacity", opacity);
    }
  }

  // Une seule époque visible à la fois — y compris quand `eraId` est null
  // (« Aujourd'hui » : le fond ortho, sans surcouche).
  for (const candidate of HISTORICAL_ERAS) {
    const id = historicalSourceId(candidate.id);
    if (!map.getLayer(id)) continue;
    map.setLayoutProperty(id, "visibility", candidate.id === eraId ? "visible" : "none");
  }
}
