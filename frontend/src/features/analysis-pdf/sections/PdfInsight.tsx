import { Text } from "@react-pdf/renderer";
import { pdfStyles } from "../pdfStyles";

/**
 * Mini-synthèse IA sous un titre de chapitre, pendant PDF de `CardInsight`.
 *
 * Même contrat qu'à l'écran : rien à afficher si la phrase manque, et un liseré
 * d'accent pour la distinguer de la donnée sourcée qui l'entoure.
 */
export function PdfInsight({ text }: { text?: string | null }) {
  const value = text?.trim();
  if (!value) return null;
  return <Text style={pdfStyles.insight}>{value}</Text>;
}
