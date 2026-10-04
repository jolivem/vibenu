import type { NeighborhoodAnalysisDto } from "@/types/location-analysis";
import type { NearbyMessages } from "@/i18n/messages/fr/analysis/nearby";
import { categoryLimit, groupByCategory, isTruncated, poiName, presentFamilies } from "./neighborhoodModel";
import { formatProximity } from "./proximityFormat";
import { withSectorSchool, type SectorSchool } from "./sectorSchool";

export function NeighborhoodCard({
  neighborhood,
  sectorSchool,
  m,
}: {
  neighborhood: NeighborhoodAnalysisDto;
  m: NearbyMessages;
  /**
   * Établissement de la carte scolaire. S'il figure parmi les écoles trouvées, il est
   * toujours affiché, même au-delà du plafond de la catégorie : c'est le seul de la liste
   * qui concerne vraiment l'adresse, et il n'est pas forcément le plus proche.
   */
  sectorSchool?: SectorSchool | null;
}) {
  const groups = groupByCategory(neighborhood.pois);

  return (
    <section className="card">
      <h2>{m.neighborhood.title}</h2>

      {presentFamilies(groups).map((family) => (
        <div className="poi-family" key={family.key}>
          <h3>{m.neighborhood.families[family.key]}</h3>
          {family.categories.map((category) => {
            const limit = categoryLimit(category);
            const { shown, sectorPoi } =
              category === "school"
                ? withSectorSchool(groups.school, limit, sectorSchool)
                : { shown: groups[category].slice(0, limit), sectorPoi: null };
            return (
              <div className="poi-group" key={category}>
                <p className="poi-group-label">{m.neighborhood.categories[category] ?? category}</p>
                <ul>
                  {shown.map((poi, i) => (
                    <li key={i}>
                      {poiName(poi, m.neighborhood)}{" "}
                      {poi === sectorPoi && <span className="poi-sector-tag">{m.neighborhood.sectorTag}</span>}{" "}
                      <span className="poi-distance">{m.after(formatProximity(poi.distanceMeters, m))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ))}

      {isTruncated(groups) && (
        <p className="poi-distance">{m.neighborhood.truncated}</p>
      )}

      {neighborhood.pois.length === 0 && (
        <p>{m.neighborhood.none}</p>
      )}
    </section>
  );
}
