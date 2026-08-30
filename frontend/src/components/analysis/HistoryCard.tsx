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
      <p className="muted">
        {isCommune
          ? "La commune sur les cartes et les photographies aériennes anciennes de l'IGN, de la carte de Cassini à aujourd'hui."
          : "L'adresse sur les cartes et les photographies aériennes anciennes de l'IGN. Le contour de la parcelle reste visible par-dessus : on voit ce qu'il y avait à cet endroit précis."}
      </p>

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

      <p className="elections-footnote">
        Source : IGN · Géoplateforme (cartes.gouv.fr). Les cartes anciennes s&apos;arrêtent
        aux frontières de leur époque — la Savoie et le comté de Nice ne figurent pas sur
        Cassini, et aucun territoire d&apos;outre-mer n&apos;est couvert avant les
        photographies aériennes.
      </p>
    </section>
  );
}
