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

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

export function PdfMobility({ mobility }: { mobility: MobilityAnalysisDto }) {
  const station = mobility.nearestStation;
  const stationIsClose = station && station.distanceMeters <= 1500;

  return (
    <View style={pdfStyles.card} wrap={false}>
      <Text style={pdfStyles.cardTitle}>Mobilité</Text>
      {(mobility.label === "bon" || mobility.label === "très bon") && (
        <Text style={pdfStyles.p}>Niveau : {mobility.label}</Text>
      )}

      {station && (
        <View>
          <Text style={pdfStyles.subtitle}>
            {stationLabel(station.mode)}
            {!stationIsClose && " la plus proche"}
          </Text>
          <View style={pdfStyles.bullet}>
            <Text style={pdfStyles.bulletDot}>• </Text>
            <Text style={pdfStyles.bulletText}>
              {station.name} — {formatDistance(station.distanceMeters)}
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
                {stop.name} — {formatDistance(stop.distanceMeters)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
