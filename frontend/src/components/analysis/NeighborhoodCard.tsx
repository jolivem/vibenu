import type { NeighborhoodAnalysisDto } from "@/types/location-analysis";

const CATEGORY_LABELS: Record<string, string> = {
  school: "Enseignement",
  supermarket: "Supermarché",
  bakery: "Boulangerie",
  pharmacy: "Pharmacie",
  doctor: "Médecin",
  park: "Parc",
  sport: "Sport",
  restaurant: "Restaurant",
  post_office: "Poste",
  bank: "Banque",
  library: "Bibliothèque",
  hospital: "Hôpital ou clinique",
  emergency: "Urgences",
};

/**
 * Les 11 catégories de POI se lisaient en liste plate, sans hiérarchie. Elles se regroupent
 * en 4 familles, qui sont la façon dont on cherche réellement : « y a-t-il une école ? »,
 * « un médecin ? », plutôt que de parcourir onze rubriques de même niveau.
 *
 * L'ordre à l'intérieur d'une famille est celui de ce tableau, pas celui du DTO — le plus
 * structurant d'abord (l'école avant la bibliothèque, la pharmacie avant le médecin).
 */
const FAMILIES: Array<{ title: string; categories: string[] }> = [
  { title: "Enseignement", categories: ["school"] },
  { title: "Soins", categories: ["pharmacy", "doctor", "hospital", "emergency"] },
  { title: "Commerces & services", categories: ["supermarket", "bakery", "post_office", "bank"] },
  { title: "Culture & loisirs", categories: ["library", "park", "sport", "restaurant"] },
];

const DEFAULT_PER_CATEGORY_LIMIT = 3;
const PER_CATEGORY_LIMIT: Record<string, number> = {
  school: 6,
  hospital: 2,
  emergency: 1,
};

/**
 * Au-delà de cette distance, on ne propose plus de temps de marche.
 *
 * « 172 min à pied » pour un hôpital à 13 km est une réponse absurde à une question
 * qu'on ne se pose pas : personne ne va aux urgences à pied. Le kilométrage seul est
 * l'unité juste pour ces équipements-là.
 */
const WALKABLE_LIMIT_METERS = 2000;

function groupByCategory(pois: NeighborhoodAnalysisDto["pois"]) {
  const groups: Record<string, typeof pois> = {};
  for (const poi of pois) {
    const key = poi.category;
    if (!groups[key]) groups[key] = [];
    groups[key].push(poi);
  }
  return groups;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

// Vitesse de marche moyenne ≈ 4,5 km/h (75 m/min)
function formatWalkingTime(meters: number): string {
  const minutes = Math.max(1, Math.round(meters / 75));
  if (minutes < 60) return `${minutes} min à pied`;
  const h = Math.floor(minutes / 60);
  const m = Math.round((minutes - h * 60) / 5) * 5;
  return m === 0 ? `${h} h à pied` : `${h} h ${String(m).padStart(2, "0")} à pied`;
}

export function NeighborhoodCard({ neighborhood }: { neighborhood: NeighborhoodAnalysisDto }) {
  const groups = groupByCategory(neighborhood.pois);
  const isTruncated = Object.entries(groups).some(([category, pois]) => {
    const limit = PER_CATEGORY_LIMIT[category] ?? DEFAULT_PER_CATEGORY_LIMIT;
    return pois.length > limit;
  });

  // Une catégorie absente du tableau des familles resterait invisible : on la rattache à
  // « Autres » plutôt que de la perdre silencieusement si le back en ajoute une.
  const known = new Set(FAMILIES.flatMap((family) => family.categories));
  const others = Object.keys(groups).filter((category) => !known.has(category));
  const families = others.length
    ? [...FAMILIES, { title: "Autres", categories: others }]
    : FAMILIES;

  return (
    <section className="card">
      <h2>Voisinage</h2>
      <p>Niveau : {neighborhood.label}</p>

      {families.map((family) => {
        const present = family.categories.filter((category) => groups[category]?.length);
        if (present.length === 0) return null;

        return (
          <div className="poi-family" key={family.title}>
            <h3>{family.title}</h3>
            {present.map((category) => {
              const limit = PER_CATEGORY_LIMIT[category] ?? DEFAULT_PER_CATEGORY_LIMIT;
              return (
                <div className="poi-group" key={category}>
                  <p className="poi-group-label">{CATEGORY_LABELS[category] ?? category}</p>
                  <ul>
                    {groups[category].slice(0, limit).map((poi, i) => (
                      <li key={i}>
                        {poi.name}{" "}
                        <span className="poi-distance">
                          —{" "}
                          {poi.distanceMeters <= WALKABLE_LIMIT_METERS
                            ? `${formatWalkingTime(poi.distanceMeters)} (${formatDistance(poi.distanceMeters)})`
                            : formatDistance(poi.distanceMeters)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        );
      })}

      {isTruncated && (
        <p className="poi-distance">Liste non exhaustive — seuls les équipements les plus proches sont affichés.</p>
      )}

      {neighborhood.pois.length === 0 && (
        <p>Aucun équipement trouvé à proximité.</p>
      )}
    </section>
  );
}
