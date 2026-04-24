import { Text, View } from "@react-pdf/renderer";
import type { CadastreAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

function formatSurface(m2: number): string {
  if (m2 >= 10_000) {
    return `${(m2 / 10_000).toFixed(2)} ha`;
  }
  return `${m2.toLocaleString("fr-FR")} m²`;
}

const ZONE_STYLE = {
  U: pdfStyles.zoneU,
  AU: pdfStyles.zoneAU,
  A: pdfStyles.zoneA,
  N: pdfStyles.zoneN,
} as const;

const ZONE_LABEL: Record<string, string> = {
  U: "Urbain",
  AU: "À urbaniser",
  A: "Agricole",
  N: "Naturel",
};

export function PdfCadastre({ cadastre }: { cadastre: CadastreAnalysisDto }) {
  if (!cadastre.parcel && !cadastre.urbanZone) return null;

  return (
    <View style={pdfStyles.card} wrap={false}>
      <Text style={pdfStyles.cardTitle}>Cadastre & urbanisme</Text>

      {cadastre.parcel && (
        <View>
          <Text style={pdfStyles.subtitle}>Parcelle</Text>
          <Text style={pdfStyles.p}>
            Référence : Section {cadastre.parcel.section}, n° {cadastre.parcel.numero}
          </Text>
          <Text style={pdfStyles.p}>Surface : {formatSurface(cadastre.parcel.contenance)}</Text>
          <Text style={pdfStyles.p}>Commune : {cadastre.parcel.commune}</Text>
        </View>
      )}

      {cadastre.urbanZone && (
        <View>
          <Text style={pdfStyles.subtitle}>Zone PLU</Text>
          <View style={pdfStyles.riskRow}>
            <Text
              style={[
                pdfStyles.badge,
                (ZONE_STYLE as Record<string, typeof pdfStyles.zoneU>)[cadastre.urbanZone.type] ?? pdfStyles.zoneDefault,
              ]}
            >
              {ZONE_LABEL[cadastre.urbanZone.type] ?? cadastre.urbanZone.type}
            </Text>
            <Text style={pdfStyles.p}>
              {cadastre.urbanZone.code} — {cadastre.urbanZone.label}
            </Text>
          </View>
        </View>
      )}

      {cadastre.prescriptions.length > 0 && (
        <View>
          <Text style={pdfStyles.subtitle}>Prescriptions d&apos;urbanisme</Text>
          {cadastre.prescriptions.map((p, i) => (
            <View key={i} style={pdfStyles.bullet}>
              <Text style={pdfStyles.bulletDot}>• </Text>
              <Text style={pdfStyles.bulletText}>{p.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
