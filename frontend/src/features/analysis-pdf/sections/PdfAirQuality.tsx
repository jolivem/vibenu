import { Text, View } from "@react-pdf/renderer";
import type { AirQualityAnalysisDto, AirQualityLevel } from "@/types/location-analysis";
import { COLORS, FONTS, pdfStyles } from "../pdfStyles";

const LEVEL_COLOR: Record<AirQualityLevel, string> = {
  bon: "#16a34a",
  moyen: "#eab308",
  dégradé: "#f97316",
  mauvais: "#dc2626",
  très_mauvais: "#7c1d6f",
};

const LEVEL_LABEL: Record<AirQualityLevel, string> = {
  bon: "Bon",
  moyen: "Moyen",
  dégradé: "Dégradé",
  mauvais: "Mauvais",
  très_mauvais: "Très mauvais",
};

const WEEKDAY_FR = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

function shortDay(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAY_FR[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`;
}

export function PdfAirQuality({ airQuality }: { airQuality: AirQualityAnalysisDto }) {
  const hasHistory = airQuality.recentDays.length >= 2;
  const monthly = airQuality.monthly;

  if (!hasHistory && !monthly) return null;

  return (
    <View>
      {hasHistory && (
        <View style={pdfStyles.airHistoryWrap} wrap={false}>
          <Text style={pdfStyles.airHistoryTitle}>
            Sur les {airQuality.recentDays.length} derniers jours
          </Text>
          <View style={pdfStyles.airHistoryStrip}>
            {airQuality.recentDays.map((d) => (
              <View key={d.date} style={pdfStyles.airHistoryDay}>
                <View
                  style={[pdfStyles.airHistoryDot, { backgroundColor: LEVEL_COLOR[d.level] }]}
                />
                <Text style={pdfStyles.airHistoryDate}>{shortDay(d.date)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {monthly && monthly.daysCovered > 0 && (
        <View style={{ marginTop: 12 }} wrap={false}>
          <Text style={pdfStyles.airHistoryTitle}>
            Sur les {monthly.daysCovered} derniers jours — qualité moyenne{" "}
            <Text style={{ color: LEVEL_COLOR[monthly.level], fontFamily: FONTS.serif }}>
              {LEVEL_LABEL[monthly.level]}
            </Text>
          </Text>
          {monthly.pollutants.length > 0 && (
            <View style={{ marginTop: 6 }}>
              {monthly.pollutants.map((p) => (
                <View
                  key={p.code}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 2,
                  }}
                >
                  <View
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 4.5,
                      backgroundColor: LEVEL_COLOR[p.level],
                      marginRight: 6,
                    }}
                  />
                  <Text style={{ fontSize: 9.5, color: COLORS.text }}>{p.label}</Text>
                  <Text style={{ fontSize: 9, color: COLORS.muted, marginLeft: 6 }}>
                    — {LEVEL_LABEL[p.level]}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
