"use client";

import { Map } from "@/components/map/Map";
import type { CommuneSlugEntry } from "@/lib/commune-slugs";
import type { GeoJsonGeometryDto } from "@/server-shared/types/location-analysis.dto";

interface Props {
  commune: CommuneSlugEntry;
  contour: GeoJsonGeometryDto | null;
}

export function CommuneMapSection({ commune, contour }: Props) {
  if (!contour) return null;

  return (
    <section className="commune-section" id="carte">
      <div className="commune-section-head">
        <h2 className="commune-section-title">
          {commune.nomCourt} <i>sur la carte</i>
        </h2>
        <span className="section-meta">Contour de l&apos;arrondissement</span>
      </div>

      <div className="commune-map-wrap">
        <Map
          lat={commune.lat}
          lon={commune.lon}
          label={commune.nomAffiche}
          communeContour={contour}
          height="360px"
          showLayerToggle={false}
        />
      </div>
    </section>
  );
}
