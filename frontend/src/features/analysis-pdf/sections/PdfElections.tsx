import { Text, View } from "@react-pdf/renderer";
import type { ElectionsAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

const PARTI_COLOR: Record<string, string> = {
  LO: "#bf3f3f",
  PCF: "#cc0000",
  REN: "#ffc000",
  RES: "#7e857e",
  RN: "#0d3a6b",
  REC: "#1f4068",
  LFI: "#cc0066",
  PS: "#ff8da1",
  EELV: "#3aaa35",
  LR: "#1f5fbf",
  NPA: "#7a1f1f",
  DLF: "#205d96",
};

function fmt(v: number): string {
  return `${v.toFixed(1).replace(".", ",")} %`;
}

function fmtDelta(delta: number): string {
  const r = Math.round(delta * 10) / 10;
  if (r === 0) return "= national";
  const sign = r > 0 ? "+" : "−";
  return `${sign}${Math.abs(r).toFixed(1).replace(".", ",")} pts`;
}

export function PdfElections({ elections }: { elections: ElectionsAnalysisDto }) {
  const sorted = [...elections.candidates].sort(
    (a, b) => b.pctCommune - a.pctCommune,
  );
  const max = Math.max(
    ...sorted.flatMap((c) => [c.pctCommune, c.pctNational]),
    1,
  );

  return (
    <View wrap={false}>
      <Text style={pdfStyles.elecHeading}>Présidentielle 2022 — 1er tour</Text>
      <Text style={pdfStyles.elecSub}>
        Participation : {fmt(elections.participationPct)} · France :{" "}
        {fmt(elections.nationalParticipationPct)}
      </Text>

      <View style={pdfStyles.elecList}>
        {sorted.map((c) => {
          const delta = c.pctCommune - c.pctNational;
          const wCommune = (c.pctCommune / max) * 100;
          const wNational = (c.pctNational / max) * 100;
          const color = PARTI_COLOR[c.parti] ?? COLORS_DEFAULT;

          return (
            <View key={c.candidat} style={pdfStyles.elecRow}>
              <View style={pdfStyles.elecRowHead}>
                <Text style={pdfStyles.elecName}>
                  {c.candidat}
                  <Text style={pdfStyles.elecParti}>  {c.parti}</Text>
                </Text>
                <Text
                  style={
                    delta > 0
                      ? pdfStyles.elecDeltaUp
                      : delta < 0
                        ? pdfStyles.elecDeltaDown
                        : pdfStyles.elecDelta
                  }
                >
                  {fmtDelta(delta)}
                </Text>
              </View>

              <View style={pdfStyles.elecPairRow}>
                <Text style={pdfStyles.elecBarLabel}>Commune</Text>
                <View style={pdfStyles.elecBarTrack}>
                  <View
                    style={[
                      pdfStyles.elecBarFill,
                      { width: `${wCommune}%`, backgroundColor: color },
                    ]}
                  />
                </View>
                <Text style={pdfStyles.elecPct}>{fmt(c.pctCommune)}</Text>
              </View>

              <View style={pdfStyles.elecPairRow}>
                <Text style={pdfStyles.elecBarLabel}>France</Text>
                <View style={pdfStyles.elecBarTrack}>
                  <View
                    style={[
                      pdfStyles.elecBarFill,
                      pdfStyles.elecBarFillNational,
                      { width: `${wNational}%`, backgroundColor: color },
                    ]}
                  />
                </View>
                <Text style={pdfStyles.elecPctNational}>{fmt(c.pctNational)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const COLORS_DEFAULT = "#6b7280";
