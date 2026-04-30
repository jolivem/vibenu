import { Text, View } from "@react-pdf/renderer";
import type { MobilityAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

function stationLabel(mode: string): string {
  switch (mode) {
    case "métro/RER": return "Métro / RER";
    case "metro": return "Métro";
    case "rer": return "RER";
    case "train": return "Gare";
    default: return "Station";
  }
}

export function PdfMobility({ mobility }: { mobility: MobilityAnalysisDto }) {
  return (
    <View style={pdfStyles.card} wrap={false}>
      <Text style={pdfStyles.cardTitle}>Mobilité</Text>
      <Text style={pdfStyles.p}>Niveau : {mobility.label}</Text>

      {mobility.nearestStation && (
        <View>
          <Text style={pdfStyles.subtitle}>{stationLabel(mobility.nearestStation.mode)}</Text>
          <View style={pdfStyles.bullet}>
            <Text style={pdfStyles.bulletDot}>• </Text>
            <Text style={pdfStyles.bulletText}>
              {mobility.nearestStation.name} — {mobility.nearestStation.distanceMeters} m
            </Text>
          </View>
        </View>
      )}

      {mobility.nearestStops.length > 0 && (
        <View>
          <Text style={pdfStyles.subtitle}>Bus</Text>
          {mobility.nearestStops.map((stop) => (
            <View key={stop.id} style={pdfStyles.bullet}>
              <Text style={pdfStyles.bulletDot}>• </Text>
              <Text style={pdfStyles.bulletText}>
                {stop.name} — {stop.distanceMeters} m
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
