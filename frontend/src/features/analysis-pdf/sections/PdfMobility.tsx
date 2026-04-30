import { Text, View } from "@react-pdf/renderer";
import type { MobilityAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

export function PdfMobility({ mobility }: { mobility: MobilityAnalysisDto }) {
  const stops = [
    ...(mobility.nearestStation
      ? [
          {
            id: "station-" + mobility.nearestStation.name,
            name: mobility.nearestStation.name,
            distanceMeters: mobility.nearestStation.distanceMeters,
          },
        ]
      : []),
    ...mobility.nearestStops,
  ].slice(0, 6);

  const level = mobility.label.charAt(0).toUpperCase() + mobility.label.slice(1);

  return (
    <View style={pdfStyles.mobilityBand} wrap={false}>
      <View style={pdfStyles.mobilityStatus}>
        <Text style={pdfStyles.mobilityStatusLabel}>Niveau</Text>
        <Text style={pdfStyles.mobilityStatusValue}>{level}</Text>
      </View>
      <View style={pdfStyles.mobilityList}>
        {stops.map((stop) => (
          <View key={stop.id} style={pdfStyles.mobilityStop}>
            <Text style={pdfStyles.mobilityStopName}>{stop.name}</Text>
            <Text style={pdfStyles.mobilityStopDist}>{stop.distanceMeters} m</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
