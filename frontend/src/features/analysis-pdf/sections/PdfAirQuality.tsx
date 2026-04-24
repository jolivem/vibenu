import { Text, View } from "@react-pdf/renderer";
import type { AirQualityAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

const LEVEL_CONFIG = {
  bon: { label: "Bon", style: pdfStyles.airBon },
  moyen: { label: "Moyen", style: pdfStyles.airMoyen },
  dégradé: { label: "Dégradé", style: pdfStyles.airDegrade },
  mauvais: { label: "Mauvais", style: pdfStyles.airMauvais },
  très_mauvais: { label: "Très mauvais", style: pdfStyles.airTresMauvais },
} satisfies Record<AirQualityAnalysisDto["level"], { label: string; style: unknown }>;

export function PdfAirQuality({ airQuality }: { airQuality: AirQualityAnalysisDto }) {
  const config = LEVEL_CONFIG[airQuality.level];

  return (
    <View style={pdfStyles.card} wrap={false}>
      <Text style={pdfStyles.cardTitle}>Qualité de l&apos;air</Text>
      <View style={pdfStyles.riskRow}>
        <Text style={pdfStyles.p}>Niveau : </Text>
        <Text style={[pdfStyles.badge, config.style]}>{config.label}</Text>
      </View>
      <Text style={[pdfStyles.p, pdfStyles.muted]}>{airQuality.message}</Text>
    </View>
  );
}
