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

function groupByCategory(pois: NeighborhoodAnalysisDto["pois"]) {
  const groups: Record<string, typeof pois> = {};
  for (const poi of pois) {
    const key = poi.category;
    if (!groups[key]) groups[key] = [];
    groups[key].push(poi);
  }
  return groups;
}

export function NeighborhoodCard({ neighborhood }: { neighborhood: NeighborhoodAnalysisDto }) {
  const groups = groupByCategory(neighborhood.pois);

  return (
    <section className="card">
      <h2>Voisinage</h2>
      <p>Score : {neighborhood.score}/100</p>
      <p>Niveau : {neighborhood.label}</p>

      {Object.entries(groups).map(([category, pois]) => (
        <div key={category}>
          <h3>{CATEGORY_LABELS[category] ?? category}</h3>
          <ul>
            {pois.slice(0, 3).map((poi, i) => (
              <li key={i}>
                {poi.name} — {poi.distanceMeters} m
              </li>
            ))}
          </ul>
        </div>
      ))}

      {neighborhood.pois.length === 0 && (
        <p>Aucun équipement trouvé à proximité.</p>
      )}
    </section>
  );
}
