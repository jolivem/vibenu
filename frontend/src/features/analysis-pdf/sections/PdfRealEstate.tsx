import { Text, View } from "@react-pdf/renderer";
import type { RealEstateAnalysisDto } from "@/types/location-analysis";
import { formatFr } from "@/lib/format";
import { pdfStyles } from "../pdfStyles";

export function PdfRealEstate({ realEstate }: { realEstate: RealEstateAnalysisDto }) {
  return (
    <View style={pdfStyles.immoBlock} wrap={false}>
      <View style={pdfStyles.immoRow}>
        <View style={pdfStyles.immoStat}>
          <Text style={pdfStyles.immoStatLabel}>Prix médian</Text>
          <Text style={pdfStyles.immoStatValue}>
            {realEstate.medianPricePerSquareMeter != null
              ? `${formatFr(realEstate.medianPricePerSquareMeter)} €/m²`
              : "n/a"}
          </Text>
        </View>
        <View style={[pdfStyles.immoStat, pdfStyles.immoStatBordered]}>
          <Text style={pdfStyles.immoStatLabel}>Transactions</Text>
          <Text style={pdfStyles.immoStatValue}>
            {realEstate.nearbyTransactionsCount ?? "n/a"}
          </Text>
        </View>
      </View>
    </View>
  );
}
