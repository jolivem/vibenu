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
        {Object.entries(groups).map(([category, pois]) => (
          <View key={category} style={pdfStyles.voisCat} wrap={false}>
            <Text style={pdfStyles.voisCatTitle}>
              {CATEGORY_LABELS[category] ?? category}
            </Text>
            {pois.slice(0, 3).map((poi, i) => (
              <View key={i} style={pdfStyles.voisItem}>
                <Text style={pdfStyles.voisItemName}>{poi.name}</Text>
                <Text style={pdfStyles.voisItemDist}>{poi.distanceMeters} m</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
