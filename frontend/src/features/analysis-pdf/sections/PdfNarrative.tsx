import { Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "../pdfStyles";

export function PdfNarrative({ paragraph }: { paragraph: string }) {
  return (
    <View style={pdfStyles.card} wrap={false}>
      <Text style={pdfStyles.cardTitle}>Synthèse</Text>
      <Text style={pdfStyles.p}>{paragraph}</Text>
    </View>
  );
}
