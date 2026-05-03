import { Text, View } from "@react-pdf/renderer";
import type { ClimateAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

const COLOR_TEMP = "#dc2626";
const COLOR_RAIN = "#2563eb";
const COLOR_SUN = "#f59e0b";

interface Row {
  label: string;
  unit: string;
  format: (n: number) => string;
  color: string;
  commune: number;
  national: number;
}

const fmtTemp = (n: number) => `${n.toFixed(1).replace(".", ",")} °C`;
const fmtMm = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} mm`;
const fmtHours = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} h`;

function fmtDelta(delta: number, unit: string): string {
  const r = Math.round(delta * 10) / 10;
  if (r === 0) return "= France";
  const sign = r > 0 ? "+" : "−";
  return `${sign}${Math.abs(r).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ${unit}`;
}

export function PdfClimate({ climate }: { climate: ClimateAnalysisDto }) {
  const rows: Row[] = [
    { label: "Température moyenne", unit: "°C", format: fmtTemp, color: COLOR_TEMP, commune: climate.temperatureC, national: climate.national.temperatureC },
    { label: "Précipitations annuelles", unit: "mm", format: fmtMm, color: COLOR_RAIN, commune: climate.precipitationMm, national: climate.national.precipitationMm },
    { label: "Ensoleillement annuel", unit: "h", format: fmtHours, color: COLOR_SUN, commune: climate.sunshineHours, national: climate.national.sunshineHours },
  ];

  return (
    <View wrap={false}>
      <Text style={pdfStyles.elecHeading}>Climat</Text>
      <Text style={pdfStyles.elecSub}>
        Source : Open-Meteo (ERA5) · moyenne France : Météo-France
      </Text>

      <View style={pdfStyles.elecList}>
        {rows.map((r) => {
          const max = Math.max(r.commune, r.national, 1);
          const wCommune = (r.commune / max) * 100;
          const wNational = (r.national / max) * 100;
          const delta = r.commune - r.national;

          return (
            <View key={r.label} style={pdfStyles.elecRow}>
              <View style={pdfStyles.elecRowHead}>
                <Text style={pdfStyles.elecName}>{r.label}</Text>
                <Text
                  style={
                    delta > 0
                      ? pdfStyles.elecDeltaUp
                      : delta < 0
                        ? pdfStyles.elecDeltaDown
                        : pdfStyles.elecDelta
                  }
                >
                  {fmtDelta(delta, r.unit)}
                </Text>
              </View>

              <View style={pdfStyles.elecPairRow}>
                <Text style={pdfStyles.elecBarLabel}>Commune</Text>
                <View style={pdfStyles.elecBarTrack}>
                  <View
                    style={[
                      pdfStyles.elecBarFill,
                      { width: `${wCommune}%`, backgroundColor: r.color },
                    ]}
                  />
                </View>
                <Text style={pdfStyles.climPctValue}>{r.format(r.commune)}</Text>
              </View>

              <View style={pdfStyles.elecPairRow}>
                <Text style={pdfStyles.elecBarLabel}>France</Text>
                <View style={pdfStyles.elecBarTrack}>
                  <View
                    style={[
                      pdfStyles.elecBarFill,
                      pdfStyles.elecBarFillNational,
                      { width: `${wNational}%`, backgroundColor: r.color },
                    ]}
                  />
                </View>
                <Text style={pdfStyles.climPctValueNational}>{r.format(r.national)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
