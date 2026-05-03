import { Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "../pdfStyles";

interface Props {
  narrativeParagraph: string | null;
}

export function PdfCoverResume({ narrativeParagraph }: Props) {
  const text = narrativeParagraph?.trim();

  return (
    <View style={pdfStyles.resumeBlock} wrap={false}>
      <Text style={pdfStyles.resumeEyebrow}>Synthèse</Text>
      <Text style={pdfStyles.resumeLede}>
        {text || "Synthèse non disponible — l'analyse détaillée se trouve dans les chapitres suivants."}
      </Text>
    </View>
  );
}
