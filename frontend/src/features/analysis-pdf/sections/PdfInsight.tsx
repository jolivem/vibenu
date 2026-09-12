import { Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "../pdfStyles";

/**
 * Mini-synthèse IA sous un titre de chapitre, pendant PDF de `CardInsight`.
 *
 * Même contrat qu'à l'écran : rien à afficher si la phrase manque, et le libellé
 * « EN BREF » en surtitre vert pour la distinguer de la donnée sourcée qui l'entoure.
 * `wrap={false}` pour que le libellé ne se retrouve pas seul en bas de page.
 */
export function PdfInsight({ text }: { text?: string | null }) {
  const value = text?.trim();
  if (!value) return null;
  return (
    <View wrap={false}>
      <Text style={pdfStyles.insightTag}>EN BREF</Text>
      <Text style={pdfStyles.insight}>{value}</Text>
    </View>
  );
}
