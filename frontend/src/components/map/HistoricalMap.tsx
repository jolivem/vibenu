"use client";

import { useEffect, useState } from "react";
import type { CadastreParcelDto, GeoJsonGeometryDto } from "@/types/location-analysis";
import { Map } from "./Map";
import { LazyMap } from "./LazyMap";
import { IGN_ORTHO_RASTER_STYLE } from "./basemaps";
import { EraBlendSlider, EraTimeline } from "./HistoryControls";
import { HISTORICAL_ERAS_BY_ID } from "./historicalLayers";
import { coveredEras, missingEras, nearestCoveredEraId } from "./historicalCoverage";
import { useHistoricalCoverage } from "./useHistoricalCoverage";
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

/**
 * Zoom de référence pour sonder la couverture en mode commune.
 *
 * La carte y cadre une bbox, donc son zoom réel n'est connu qu'après l'ajustement — et
 * la sonde, elle, part au montage. 13 est l'ordre de grandeur d'une commune à l'écran ;
 * la couverture étant une emprise géographique, la conclusion ne dépend pas du niveau
 * exact : là où la donnée manque, la Géoplateforme répond « rien » à tous les zooms de
 * la pyramide.
 */
const COMMUNE_PROBE_ZOOM = 13;

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
  // Le dosage ne se réinitialise pas au changement d'époque : la frise est une
  // sélection, le curseur un réglage. Qui a dosé 50 % pour lire un tracé ancien sur le
  // bâti actuel veut la même lecture à l'époque suivante, pas un retour au plein écran.
  //
  // Reste nommé `opacity` ici, et pas `blend` : c'est la valeur brute passée à
  // `raster-opacity`. Le mot juste à l'écran n'est pas le mot juste à la frontière de
  // MapLibre — c'est précisément la confusion que le libellé « Opacité » entretenait.
  const [opacity, setOpacity] = useState(100);

  const coverage = useHistoricalCoverage(lon, lat, communeContour ? COMMUNE_PROBE_ZOOM : ADDRESS_ZOOM);
  const available = coveredEras(coverage);
  const missing = missingEras(coverage);

  // L'époque de départ est choisie sans rien savoir du lieu : elle peut tomber sur un
  // trou de couverture. On ne l'apprend qu'ici, une fois la sonde revenue.
  useEffect(() => {
    if (eraId !== null && coverage[eraId] === "missing") {
      setEraId(nearestCoveredEraId(eraId, coverage));
    }
  }, [coverage, eraId]);

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
        <EraTimeline value={eraId} onChange={setEraId} eras={available} />
        <EraBlendSlider value={opacity} onChange={setOpacity} era={era ?? null} />
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
              l&apos;IGN. Choisissez une époque dans la frise pour la superposer, puis
              faites glisser le curseur pour passer de l&apos;une à l&apos;autre.
            </>
          )}
        </p>

        {/* Dire le trou plutôt que de le taire : la couverture IGN n'est pas la même
            partout, et son absence à cet endroit est une information sur le lieu. */}
        {missing.length > 0 && (
          <p className="era-coverage-note">
            Sans couverture IGN à cet endroit :{" "}
            {missing.map((absent) => `${absent.label.toLowerCase()} ${absent.period}`).join(", ")}.
          </p>
        )}
      </div>
    </div>
  );
}
