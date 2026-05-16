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
    <section className="commune-map-wrap" aria-label={`Carte de ${commune.nomAffiche}`}>
      <Map
        lat={commune.lat}
        lon={commune.lon}
        label={commune.nomAffiche}
        communeContour={contour}
        height="360px"
        showLayerToggle={false}
      />
    </section>
  );
}
