import { Text, View } from "@react-pdf/renderer";
import type { CadastreAnalysisDto } from "@/types/location-analysis";
import { formatFr } from "@/lib/format";
import { pluZoneType } from "@/components/analysis/pluZone";
import { pdfStyles } from "../pdfStyles";

function formatSurface(m2: number): string {
  if (m2 >= 10_000) {
    return `${(m2 / 10_000).toFixed(2)} ha`;
  }
  return `${formatFr(m2)} m²`;
}

export function PdfCadastre({ cadastre }: { cadastre: CadastreAnalysisDto }) {
  if (!cadastre.parcel && !cadastre.urbanZone) return null;

  return (
    <View wrap={false}>
      <View style={pdfStyles.cadCols}>
        <View style={pdfStyles.cadCol}>
          {cadastre.parcel && (
            <>
              <View style={pdfStyles.cadRow}>
                <Text style={pdfStyles.cadRowKey}>Référence</Text>
                <Text style={pdfStyles.cadRowVal}>
                  Section {cadastre.parcel.section} · n° {cadastre.parcel.numero}
                </Text>
              </View>
              <View style={pdfStyles.cadRow}>
                <Text style={pdfStyles.cadRowKey}>Surface</Text>
                <Text style={pdfStyles.cadRowVal}>
                  {formatSurface(cadastre.parcel.contenance)}
                </Text>
              </View>
              <View style={pdfStyles.cadRow}>
                <Text style={pdfStyles.cadRowKey}>Commune</Text>
                <Text style={pdfStyles.cadRowVal}>{cadastre.parcel.commune}</Text>
              </View>
            </>
          )}
          {cadastre.urbanZone && (
            <View style={pdfStyles.cadRow}>
              <Text style={pdfStyles.cadRowKey}>Zone PLU</Text>
              <Text style={pdfStyles.zonePill}>
                {cadastre.urbanZone.code} · {pluZoneType(cadastre.urbanZone.type).label}
              </Text>
            </View>
          )}
        </View>
        <View style={pdfStyles.cadCol}>
          {cadastre.prescriptions.length > 0 ? (
            <View style={pdfStyles.prescList}>
              {cadastre.prescriptions.slice(0, 6).map((p, i) => (
                <View key={i} style={pdfStyles.prescItem}>
                  <Text style={pdfStyles.prescBullet}>§</Text>
                  <Text style={pdfStyles.prescText}>{p.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={pdfStyles.cadRowKey}>
              Aucune prescription d&apos;urbanisme renseignée.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
