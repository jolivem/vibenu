import type { AnalysisMode, CadastreParcelDto, GeoJsonGeometryDto } from "@/types/location-analysis";
import { HistoricalMap } from "@/components/map/HistoricalMap";

interface Props {
  lat: number;
  lon: number;
  label: string;
  mode: AnalysisMode;
  cadastreParcel: CadastreParcelDto | null;
  communeContour: GeoJsonGeometryDto | null;
  height: string;
}

/**
 * Le lieu à travers le temps.
 *
 * Première card de l'écran qui ne consomme aucune donnée du serveur : tout vient de la
 * Géoplateforme IGN, appelée directement par la carte. Elle n'a donc pas de raison
 * d'être masquée — il n'y a pas d'adresse française sans passé.
 *
 * L'époque de départ suit l'échelle, pas la surface : à l'échelle d'une commune, Cassini
 * est natif et c'est la vue la plus frappante ; à l'échelle d'une adresse, il faudrait
 * l'agrandir ×2 alors qu'une photographie aérienne de 1950 y est nette — et beaucoup
 * plus parlante sur ce qu'est devenue la parcelle.
 */
export function HistoryCard({ lat, lon, label, mode, cadastreParcel, communeContour, height }: Props) {
  const isCommune = mode === "commune";

  return (
    <section className="card">
      <h2>Le lieu autrefois</h2>

      <div className="card-map">
        <HistoricalMap
          lat={lat}
          lon={lon}
          label={label}
          height={height}
          cadastreParcel={isCommune ? null : cadastreParcel}
          communeContour={isCommune ? communeContour : null}
          defaultEraId={isCommune ? "cassini" : "ortho-1950-1965"}
        />
      </div>
    </section>
  );
}
