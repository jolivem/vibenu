"use client";

import type { GeoJsonGeometryDto } from "@/types/location-analysis";
import { HistoricalMap } from "@/components/map/HistoricalMap";
import { SourceLine } from "./SourceLine";

interface Props {
  commune: { nomAffiche: string; nomCourt: string; lat: number; lon: number };
  /** Non nul : la page a déjà vérifié sa présence pour activer la section. */
  contour: GeoJsonGeometryDto;
}

/**
 * La commune à travers le temps, sur les cartes anciennes de l'IGN.
 *
 * Elle a besoin du contour : sans lui il n'y a pas de bbox à ajuster et la carte
 * retomberait sur un zoom d'adresse, beaucoup trop serré pour une commune. Ce garde vit
 * désormais dans `communeSectionContent`, avec tous les autres ; la carte de situation
 * lisant le même contour, les deux vues cartographiques apparaissent toujours ensemble.
 *
 * La liste des époques, avec leur présentation, n'est plus recopiée sous la carte : ~300 mots
 * identiques sur les 45 pages. Elle vit sur `/commune/methode#histoire` ; la frise de la carte
 * garde le contexte de l'époque affichée.
 */
export function CommuneHistoryCard({ commune, contour }: Props) {
  return (
    <section className="card">
      <h2>{commune.nomCourt} autrefois</h2>

      <div className="card-map card-map--inline">
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

      <SourceLine anchor="histoire">IGN Géoplateforme, cartes et photographies anciennes</SourceLine>
    </section>
  );
}
