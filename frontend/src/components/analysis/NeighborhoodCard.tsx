import type { NeighborhoodAnalysisDto } from "@/types/location-analysis";
import { CATEGORY_LABELS, categoryLimit, groupByCategory, isTruncated, presentFamilies } from "./neighborhoodModel";
import { formatProximity } from "./proximityFormat";
import { withSectorSchool, type SectorSchool } from "./sectorSchool";

export function NeighborhoodCard({
  neighborhood,
  sectorSchool,
}: {
  neighborhood: NeighborhoodAnalysisDto;
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
      <h2>Voisinage</h2>

      {presentFamilies(groups).map((family) => (
        <div className="poi-family" key={family.title}>
          <h3>{family.title}</h3>
          {family.categories.map((category) => {
            const limit = categoryLimit(category);
            const { shown, sectorPoi } =
              category === "school"
                ? withSectorSchool(groups.school, limit, sectorSchool)
                : { shown: groups[category].slice(0, limit), sectorPoi: null };
            return (
              <div className="poi-group" key={category}>
                <p className="poi-group-label">{CATEGORY_LABELS[category] ?? category}</p>
                <ul>
                  {shown.map((poi, i) => (
                    <li key={i}>
                      {poi.name}{" "}
                      {poi === sectorPoi && <span className="poi-sector-tag">de secteur</span>}{" "}
                      <span className="poi-distance">— {formatProximity(poi.distanceMeters)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ))}

      {isTruncated(groups) && (
        <p className="poi-distance">Liste non exhaustive — seuls les équipements les plus proches sont affichés.</p>
      )}

      {neighborhood.pois.length === 0 && (
        <p>Aucun équipement trouvé à proximité.</p>
      )}
    </section>
  );
}
