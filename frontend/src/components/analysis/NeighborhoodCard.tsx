import type { NeighborhoodAnalysisDto } from "@/types/location-analysis";
import type { NearbyMessages } from "@/i18n/messages/fr/analysis/nearby";
import { categoryLimit, groupByCategory, isTruncated, poiName, presentFamilies } from "./neighborhoodModel";
import { formatProximity } from "./proximityFormat";
import { CardDetailToggle, useCardDetail } from "./readingMode";

/**
 * Les services du quotidien autour de l'adresse, par famille et par catégorie.
 *
 * En mode « L'essentiel », le plus proche de chaque catégorie ; les suivants dans le détail.
 */
export function NeighborhoodCard({
  neighborhood,
  m,
}: {
  neighborhood: NeighborhoodAnalysisDto;
  m: NearbyMessages;
}) {
  const groups = groupByCategory(neighborhood.pois);
  const detail = useCardDetail();
  const hasMore = Object.values(groups).some((pois) => pois.length > 1);

  return (
    <section className="card">
      <h2>{m.neighborhood.title}</h2>

      {presentFamilies(groups).map((family) => (
        <div className="poi-family" key={family.key}>
          <h3>{m.neighborhood.families[family.key]}</h3>
          {family.categories.map((category) => {
            // Le collège de secteur n'est plus repéré ici : la section Enseignement le
            // désigne, dans la card Collèges et sur sa carte.
            const shown = groups[category].slice(0, detail.open ? categoryLimit(category) : 1);
            return (
              <div className="poi-group" key={category}>
                <p className="poi-group-label">{m.neighborhood.categories[category] ?? category}</p>
                <ul>
                  {shown.map((poi, i) => (
                    <li key={i}>
                      {poiName(poi, m.neighborhood)}{" "}
                      <span className="poi-distance">{m.after(formatProximity(poi.distanceMeters, m))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ))}

      {detail.open && isTruncated(groups) && (
        <p className="poi-distance">{m.neighborhood.truncated}</p>
      )}

      {neighborhood.pois.length === 0 && (
        <p>{m.neighborhood.none}</p>
      )}

      {detail.enabled && hasMore && <CardDetailToggle open={detail.open} onToggle={detail.toggle} />}
    </section>
  );
}
