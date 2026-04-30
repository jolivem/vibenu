import { Text, View } from "@react-pdf/renderer";
import type { AirQualityAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

const LEVEL_LABEL: Record<AirQualityAnalysisDto["level"], string> = {
  bon: "Bon",
  moyen: "Moyen",
  dégradé: "Dégradé",
  mauvais: "Mauvais",
  très_mauvais: "Très mauvais",
};

export function PdfAirQuality({ airQuality }: { airQuality: AirQualityAnalysisDto }) {
  return (
    <View style={pdfStyles.airBand} wrap={false}>
      <Text style={pdfStyles.airBandTitle}>Qualité de l&apos;air</Text>
      <Text style={pdfStyles.airBandLevel}>{LEVEL_LABEL[airQuality.level]}</Text>
      {airQuality.message && (
        <Text style={pdfStyles.airBandText}>{airQuality.message}</Text>
      )}
    </View>
  );
}
