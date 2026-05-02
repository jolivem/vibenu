import { Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "../pdfStyles";

interface Props {
  narrativeParagraph: string | null;
}

export function PdfCoverResume({ narrativeParagraph }: Props) {
  const text = narrativeParagraph?.trim();
  if (!text) return null;

  return (
    <View style={pdfStyles.resumeBlock} wrap={false}>
      <Text style={pdfStyles.resumeEyebrow}>Synthèse</Text>
      <Text style={pdfStyles.resumeLede}>{text}</Text>
    </View>
  );
}
