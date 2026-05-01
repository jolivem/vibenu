import { Text, View } from "@react-pdf/renderer";
import type { AnalysisMode, MobilityAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

// Vitesse de marche moyenne ≈ 4,5 km/h (75 m/min)
function formatWalkingTime(m: number): string {
  const minutes = Math.max(1, Math.round(m / 75));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const r = Math.round((minutes - h * 60) / 5) * 5;
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, "0")}`;
}

export function PdfMobility({
  mobility,
  mode,
}: {
  mobility: MobilityAnalysisDto;
  mode: AnalysisMode;
}) {
  const isCommune = mode === "commune";

  // En mode commune, on n'affiche que la gare la plus proche (les bus stops sont
  // mesurés depuis le centroïde, donc peu pertinents). Les distances sont aussi masquées.
  const stops = isCommune
    ? mobility.nearestStations.slice(0, 1)
    : [...mobility.nearestStops, ...mobility.nearestStations].slice(0, 8);

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
            {!isCommune && (
              <Text style={pdfStyles.mobilityStopDist}>
                {formatWalkingTime(stop.distanceMeters)} ({formatDistance(stop.distanceMeters)})
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
