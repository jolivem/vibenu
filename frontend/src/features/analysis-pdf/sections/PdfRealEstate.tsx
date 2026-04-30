import { Text, View } from "@react-pdf/renderer";
import type { RealEstateAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

function fmtPriceLevel(level: string | null | undefined): string {
  if (!level) return "n/a";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function PdfRealEstate({ realEstate }: { realEstate: RealEstateAnalysisDto }) {
  return (
    <View style={pdfStyles.immoBlock} wrap={false}>
      <Text style={pdfStyles.immoHeading}>Immobilier</Text>
      <View style={pdfStyles.immoRow}>
        <View style={pdfStyles.immoStat}>
          <Text style={pdfStyles.immoStatLabel}>Prix médian</Text>
          <Text style={pdfStyles.immoStatValue}>
            {realEstate.medianPricePerSquareMeter != null
              ? `${realEstate.medianPricePerSquareMeter.toLocaleString("fr-FR")} €/m²`
              : "n/a"}
          </Text>
        </View>
        <View style={[pdfStyles.immoStat, pdfStyles.immoStatBordered]}>
          <Text style={pdfStyles.immoStatLabel}>Transactions</Text>
          <Text style={pdfStyles.immoStatValue}>
            {realEstate.nearbyTransactionsCount ?? "n/a"}
          </Text>
        </View>
        <View style={[pdfStyles.immoStat, pdfStyles.immoStatBordered]}>
          <Text style={pdfStyles.immoStatLabel}>Niveau de prix</Text>
          <Text style={pdfStyles.immoStatValueSmall}>
            {fmtPriceLevel(realEstate.priceLevel)}
          </Text>
        </View>
        <View style={[pdfStyles.immoStat, pdfStyles.immoStatBordered]}>
          <Text style={pdfStyles.immoStatLabel}>Confiance</Text>
          <Text style={pdfStyles.immoStatValueSmall}>
            {fmtPriceLevel(realEstate.confidence)}
          </Text>
        </View>
      </View>
    </View>
  );
}
