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
};

const DEFAULT_PER_CATEGORY_LIMIT = 3;
const PER_CATEGORY_LIMIT: Record<string, number> = {
  school: 6,
};

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

  return (
    <section className="card">
      <h2>Voisinage</h2>
      <p>Niveau : {neighborhood.label}</p>

      {Object.entries(groups).map(([category, pois]) => {
        const limit = PER_CATEGORY_LIMIT[category] ?? DEFAULT_PER_CATEGORY_LIMIT;
        return (
          <div key={category}>
            <h3>{CATEGORY_LABELS[category] ?? category}</h3>
            <ul>
              {pois.slice(0, limit).map((poi, i) => (
                <li key={i}>
                  {poi.name}{" "}
                  <span className="poi-distance">
                    — {formatWalkingTime(poi.distanceMeters)} ({formatDistance(poi.distanceMeters)})
                  </span>
                </li>
              ))}
            </ul>
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
