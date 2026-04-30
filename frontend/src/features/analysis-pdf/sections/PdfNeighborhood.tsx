import { Text, View } from "@react-pdf/renderer";
import type { NeighborhoodAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

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

export function PdfNeighborhood({ neighborhood }: { neighborhood: NeighborhoodAnalysisDto }) {
  const groups = groupByCategory(neighborhood.pois);

  return (
    <View style={pdfStyles.card} wrap={false}>
      <Text style={pdfStyles.cardTitle}>Voisinage</Text>
      <Text style={pdfStyles.p}>Niveau : {neighborhood.label}</Text>

      {Object.entries(groups).map(([category, pois]) => (
        <View key={category}>
          <Text style={pdfStyles.subtitle}>{CATEGORY_LABELS[category] ?? category}</Text>
          {pois.slice(0, 3).map((poi, i) => (
            <View key={i} style={pdfStyles.bullet}>
              <Text style={pdfStyles.bulletDot}>• </Text>
              <Text style={pdfStyles.bulletText}>
                {poi.name} — {poi.distanceMeters} m
              </Text>
            </View>
          ))}
        </View>
      ))}

      {neighborhood.pois.length === 0 && (
        <Text style={pdfStyles.p}>Aucun équipement trouvé à proximité.</Text>
      )}
    </View>
  );
}
