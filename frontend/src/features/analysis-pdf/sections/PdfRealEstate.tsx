import { Text, View } from "@react-pdf/renderer";
import type { RealEstateAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

export function PdfRealEstate({ realEstate }: { realEstate: RealEstateAnalysisDto }) {
  return (
    <View style={pdfStyles.card} wrap={false}>
      <Text style={pdfStyles.cardTitle}>Immobilier</Text>
      <Text style={pdfStyles.p}>Transactions proches : {realEstate.nearbyTransactionsCount ?? "n/a"}</Text>
      <Text style={pdfStyles.p}>Niveau de prix : {realEstate.priceLevel ?? "n/a"}</Text>
      <Text style={pdfStyles.p}>Confiance : {realEstate.confidence ?? "n/a"}</Text>
      {realEstate.medianPricePerSquareMeter != null && (
        <Text style={pdfStyles.p}>Médiane : {realEstate.medianPricePerSquareMeter} €/m²</Text>
      )}
    </View>
  );
}
