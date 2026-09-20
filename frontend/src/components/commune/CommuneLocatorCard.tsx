"use client";

import { Map } from "@/components/map/Map";
import type { CommuneSlugEntry } from "@/lib/commune-slugs";
import type { GeoJsonGeometryDto } from "@/server-shared/types/location-analysis.dto";

interface Props {
  commune: CommuneSlugEntry;
  contour: GeoJsonGeometryDto | null;
}

/**
 * Carte de situation, en chapeau de page comme le locator de l'écran d'analyse : elle
 * situe ce qui suit, ce n'est pas une rubrique — d'où son absence du sommaire.
 *
 * C'est la seule card à garder son garde interne : aucune entrée de sommaire ni tuile de
 * chiffre clé n'en dépend, et le faire remonter serait du cérémonial.
 */
export function CommuneLocatorCard({ commune, contour }: Props) {
  if (!contour) return null;

  return (
    <section className="card page-locator">
      <h2>{commune.nomCourt} sur la carte</h2>

      <div className="card-map card-map--inline">
        <Map
          lat={commune.lat}
          lon={commune.lon}
          label={commune.nomAffiche}
          communeContour={contour}
          height="360px"
          showLayerToggle={false}
        />
      </div>

      <p className="elections-footnote">Contour de l&apos;arrondissement · IGN.</p>
    </section>
  );
}
