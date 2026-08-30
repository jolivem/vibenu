"use client";

import { useState } from "react";
import type { CadastreParcelDto, GeoJsonGeometryDto } from "@/types/location-analysis";
import { Map } from "./Map";
import { LazyMap } from "./LazyMap";
import { IGN_ORTHO_RASTER_STYLE } from "./basemaps";
import { EraTimeline, OpacitySlider } from "./HistoryControls";
import { HISTORICAL_ERAS_BY_ID } from "./historicalLayers";
import { useHistoricalLayer } from "./useHistoricalLayer";

/**
 * Zoom d'arrivée à l'échelle d'une adresse.
 *
 * Sans lui, la présence d'une parcelle porterait la carte au zoom 17 — soit un
 * agrandissement ×8 sur Cassini, qui s'arrête au zoom 14 : un aplat beige illisible.
 * À 15, Cassini est à ×2 (lisible), l'état-major et la carte de 1950 sont natifs, les
 * photographies aériennes aussi.
 */
const ADDRESS_ZOOM = 15;

interface Props {
  lat: number;
  lon: number;
  label: string;
  height: string;
  /** Surligne la parcelle par-dessus la vue ancienne (mode adresse). */
  cadastreParcel?: CadastreParcelDto | null;
  /** Cadre la commune entière et remplace le marqueur (mode commune, pages SEO). */
  communeContour?: GeoJsonGeometryDto | null;
  /** Époque affichée au premier rendu. `null` pour démarrer sur la vue actuelle. */
  defaultEraId?: string | null;
}

/**
 * Carte du lieu à travers le temps : une époque choisie dans la frise, fondue sur la
 * photographie aérienne actuelle.
 *
 * ⚠️ Cette carte a son propre `onReady` et ne doit **jamais** recevoir celui de la carte
 * de localisation : c'est ce dernier qu'utilise l'export PDF, et y poser une couche
 * historique ferait imprimer Cassini dans le dossier.
 *
 * Seul le `<Map>` est différé par `LazyMap`, pas le composant entier : la frise et le
 * texte de contexte doivent rester dans le DOM même hors écran, pour le Ctrl+F et, sur
 * les pages commune, pour l'indexation.
 */
export function HistoricalMap({
  lat,
  lon,
  label,
  height,
  cadastreParcel,
  communeContour,
  defaultEraId = null,
}: Props) {
  const [eraId, setEraId] = useState<string | null>(defaultEraId);
  // L'opacité ne se réinitialise pas au changement d'époque : la frise est une
  // sélection, le curseur un réglage. Qui a dosé 50 % pour lire un tracé ancien sur le
  // bâti actuel veut la même lecture à l'époque suivante, pas un retour au plein écran.
  const [opacity, setOpacity] = useState(100);

  const { onMapReady } = useHistoricalLayer(eraId, opacity / 100);
  const era = eraId === null ? null : HISTORICAL_ERAS_BY_ID.get(eraId);

  return (
    <div className="historical-map">
      <LazyMap height={height}>
        <Map
          lat={lat}
          lon={lon}
          label={label}
          height={height}
          basemap={IGN_ORTHO_RASTER_STYLE}
          cadastreParcel={cadastreParcel}
          communeContour={communeContour}
          zoom={communeContour ? undefined : ADDRESS_ZOOM}
          onReady={onMapReady}
          // Les commandes de cette carte sont la frise et le curseur ; un panneau de
          // cases « Risques » sous une carte de Cassini serait du bruit.
          showLayerToggle={false}
        />
      </LazyMap>

      <div className="history-controls">
        <EraTimeline value={eraId} onChange={setEraId} />
        <OpacitySlider value={opacity} onChange={setOpacity} disabled={era === null} />
        <p className="era-context">
          {era ? (
            <>
              <strong>
                {era.label} — {era.period}.
              </strong>{" "}
              {era.context}
            </>
          ) : (
            <>
              <strong>Vue actuelle.</strong> Photographies aériennes les plus récentes de
              l&apos;IGN. Choisissez une époque dans la frise pour la superposer, et
              réglez l&apos;opacité pour comparer.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
