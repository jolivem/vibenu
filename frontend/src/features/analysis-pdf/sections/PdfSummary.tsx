import { Text, View } from "@react-pdf/renderer";
import type { SummaryDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

export function PdfSummary({ summary }: { summary: SummaryDto }) {
  return (
    <View style={pdfStyles.card} wrap={false}>
      <Text style={pdfStyles.cardTitle}>Résumé</Text>
      <Text style={pdfStyles.p}>{summary.shortText}</Text>
      <View style={pdfStyles.row}>
        <View style={pdfStyles.col}>
          <Text style={pdfStyles.subtitle}>Points forts</Text>
          {summary.strengths.map((item) => (
            <View key={item} style={pdfStyles.bullet}>
              <Text style={pdfStyles.bulletDot}>• </Text>
              <Text style={pdfStyles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
        <View style={pdfStyles.col}>
          <Text style={pdfStyles.subtitle}>Points à vérifier</Text>
          {summary.warnings.map((item) => (
            <View key={item} style={pdfStyles.bullet}>
              <Text style={pdfStyles.bulletDot}>• </Text>
              <Text style={pdfStyles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
