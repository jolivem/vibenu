import { Text, View } from "@react-pdf/renderer";
import type { NeighborhoodAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

const CATEGORY_LABELS: Record<string, string> = {
  school: "Enseignement",
  supermarket: "Supermarché",
  bakery: "Boulangerie",
  pharmacy: "Pharmacie",
  doctor: "Médecin",
  park: "Espaces verts",
  sport: "Sport",
  restaurant: "Restaurant",
  post_office: "Poste",
  bank: "Banque",
  library: "Bibliothèque",
  hospital: "Hôpital ou clinique",
  emergency: "Urgences",
};

const DEFAULT_PER_CATEGORY_LIMIT = 3;
const PER_CATEGORY_LIMIT: Record<string, number> = {
  school: 6,
  hospital: 2,
  emergency: 1,
};

/** Cf. `NeighborhoodCard` : pas de temps de marche pour un équipement qu'on rejoint en voiture. */
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
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

// Vitesse de marche moyenne ≈ 4,5 km/h (75 m/min)
function formatWalkingTime(meters: number): string {
  const minutes = Math.max(1, Math.round(meters / 75));
  if (minutes < 60) return `${minutes} min à pied`;
  const h = Math.floor(minutes / 60);
  const r = Math.round((minutes - h * 60) / 5) * 5;
  return r === 0 ? `${h} h à pied` : `${h} h ${String(r).padStart(2, "0")} à pied`;
}

export function PdfNeighborhood({ neighborhood }: { neighborhood: NeighborhoodAnalysisDto }) {
  const groups = groupByCategory(neighborhood.pois);
  const level = neighborhood.label.charAt(0).toUpperCase() + neighborhood.label.slice(1);
  const categoryCount = Object.keys(groups).length;

  if (neighborhood.pois.length === 0) {
    return (
      <View>
        <Text style={pdfStyles.airBandText}>
          Aucun équipement trouvé à proximité.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={pdfStyles.voisStatus}>
        <Text style={pdfStyles.voisStatusLabel}>Niveau</Text>
        <Text style={pdfStyles.voisStatusValue}>{level}</Text>
        <Text style={[pdfStyles.airBandText, { marginLeft: "auto", paddingLeft: 24 }]}>
          {categoryCount} catégorie{categoryCount > 1 ? "s" : ""} couverte{categoryCount > 1 ? "s" : ""}
        </Text>
      </View>

      <View style={pdfStyles.voisGrid}>
        {Object.entries(groups)
          .sort(([a], [b]) => (a === "school" ? -1 : b === "school" ? 1 : 0))
          .map(([category, pois]) => {
          const limit = PER_CATEGORY_LIMIT[category] ?? DEFAULT_PER_CATEGORY_LIMIT;
          return (
            <View key={category} style={pdfStyles.voisCat} wrap={false}>
              <Text style={pdfStyles.voisCatTitle}>
                {CATEGORY_LABELS[category] ?? category}
              </Text>
              {pois.slice(0, limit).map((poi, i) => (
                <Text key={i} style={pdfStyles.voisItem}>
                  <Text style={pdfStyles.voisItemName}>{poi.name}</Text>
                  <Text style={pdfStyles.voisItemDist}>
                    {" — "}
                    {poi.distanceMeters <= WALKABLE_LIMIT_METERS
                      ? `${formatWalkingTime(poi.distanceMeters)} (${formatDistance(poi.distanceMeters)})`
                      : formatDistance(poi.distanceMeters)}
                  </Text>
                </Text>
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
}
