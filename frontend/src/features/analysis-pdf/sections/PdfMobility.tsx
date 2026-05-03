import { Text, View } from "@react-pdf/renderer";
import type { AnalysisMode, MobilityAnalysisDto } from "@/types/location-analysis";
import { COLORS, FONTS, pdfStyles } from "../pdfStyles";

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

// Vitesse de marche moyenne ≈ 4,5 km/h (75 m/min)
function formatWalkingTime(m: number): string {
  const minutes = Math.max(1, Math.round(m / 75));
  if (minutes < 60) return `${minutes} min à pied`;
  const h = Math.floor(minutes / 60);
  const r = Math.round((minutes - h * 60) / 5) * 5;
  return r === 0 ? `${h} h à pied` : `${h} h ${String(r).padStart(2, "0")} à pied`;
}

function modeLabel(mode: string): string {
  switch (mode) {
    case "metro": return "Métro";
    case "rer": return "RER";
    case "métro/RER": return "Métro / RER";
    case "train": return "Gare";
    default: return "Station";
  }
}

interface Row {
  id: string;
  type: string;
  name: string;
  meters: number;
}

export function PdfMobility({
  mobility,
  mode,
}: {
  mobility: MobilityAnalysisDto;
  mode: AnalysisMode;
}) {
  const isCommune = mode === "commune";
  const level = mobility.label.charAt(0).toUpperCase() + mobility.label.slice(1);

  const rows: Row[] = isCommune
    ? mobility.nearestStations.slice(0, 1).map((s) => ({
        id: s.id,
        type: modeLabel(s.mode),
        name: s.name,
        meters: s.distanceMeters,
      }))
    : [
        ...mobility.nearestStops.map((s) => ({
          id: s.id,
          type: "Bus",
          name: s.name,
          meters: s.distanceMeters,
        })),
        ...mobility.nearestStations.map((s) => ({
          id: s.id,
          type: modeLabel(s.mode),
          name: s.name,
          meters: s.distanceMeters,
        })),
      ].sort((a, b) => a.meters - b.meters);

  if (rows.length === 0) {
    return (
      <View>
        <Text style={pdfStyles.airBandText}>Aucun arrêt trouvé à proximité.</Text>
      </View>
    );
  }

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          marginBottom: 14,
        }}
      >
        <Text style={pdfStyles.voisStatusLabel}>Niveau</Text>
        <Text style={pdfStyles.voisStatusValue}>{level}</Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          paddingBottom: 5,
          borderBottomWidth: 0.5,
          borderBottomColor: COLORS.hairlineStrong,
        }}
      >
        <Text style={{ width: 80, fontSize: 8, color: COLORS.muted, letterSpacing: 1 }}>
          TYPE
        </Text>
        <Text style={{ flex: 1, fontSize: 8, color: COLORS.muted, letterSpacing: 1 }}>
          ARRÊT
        </Text>
        <Text
          style={{
            width: 200,
            fontSize: 8,
            color: COLORS.muted,
            letterSpacing: 1,
            textAlign: "right",
          }}
        >
          DISTANCE
        </Text>
      </View>

      {rows.map((r) => (
        <View
          key={r.id}
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            paddingVertical: 4,
            borderBottomWidth: 0.3,
            borderBottomColor: COLORS.hairline,
          }}
        >
          <Text
            style={{
              width: 80,
              fontFamily: FONTS.serif,
              fontSize: 10,
              color: COLORS.accent,
            }}
          >
            {r.type}
          </Text>
          <Text style={{ flex: 1, fontSize: 10, color: COLORS.textSoft }}>{r.name}</Text>
          {!isCommune && (
            <Text
              style={{
                width: 200,
                fontFamily: FONTS.serif,
                fontSize: 9,
                color: COLORS.muted,
                textAlign: "right",
              }}
            >
              {formatWalkingTime(r.meters)} ({formatDistance(r.meters)})
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
