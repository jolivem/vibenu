"use client";

import type { GeoJsonGeometryDto } from "@/types/location-analysis";
import { HistoricalMap } from "@/components/map/HistoricalMap";
import { HISTORICAL_ERAS } from "@/components/map/historicalLayers";
import { FEATURES } from "@/lib/site-features";

interface Props {
  commune: { nomAffiche: string; nomCourt: string; lat: number; lon: number };
  contour: GeoJsonGeometryDto | null;
}

/**
 * La commune à travers le temps, sur les cartes anciennes de l'IGN.
 *
 * Comme `CommuneMapSection`, elle disparaît sans contour : sans lui il n'y a pas de bbox
 * à ajuster et la carte retomberait sur un zoom d'adresse, beaucoup trop serré pour une
 * commune. Les deux sections cartographiques apparaissent donc ensemble.
 *
 * La liste des époques est rendue en clair sous la carte : c'est du texte indexable, et
 * la seule partie du contenu qui survit à un navigateur sans JavaScript.
 */
export function CommuneHistorySection({ commune, contour }: Props) {
  if (!FEATURES.showHistory) return null;
  if (!contour) return null;

  return (
    <section className="commune-section commune-section--alt" id="histoire">
      <div className="commune-section-head">
        <h2 className="commune-section-title">
          {commune.nomCourt} <i>autrefois</i>
        </h2>
        <span className="section-meta">Cartes anciennes · IGN Géoplateforme</span>
      </div>

      <div className="commune-map-wrap">
        <HistoricalMap
          lat={commune.lat}
          lon={commune.lon}
          label={commune.nomAffiche}
          communeContour={contour}
          height="420px"
          // Cassini est natif aux zooms d'une commune, et c'est la vue la plus frappante.
          defaultEraId="cassini"
        />
      </div>

      <ul className="commune-era-list">
        {HISTORICAL_ERAS.map((era) => (
          <li key={era.id}>
            <strong>
              {era.label}, {era.period}
            </strong>{" "}
            — {era.context}
          </li>
        ))}
      </ul>
    </section>
  );
}
