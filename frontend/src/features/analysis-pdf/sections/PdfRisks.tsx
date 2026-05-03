import { Text, View } from "@react-pdf/renderer";
import type { RiskAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

const LEVEL_LABEL: Record<string, string> = {
  élevé: "Élevé",
  modéré: "Modéré",
  faible: "Faible",
  absent: "Absent",
};

export function PdfRisks({ risks }: { risks: RiskAnalysisDto }) {
  const highlighted = risks.categories.filter(
    (r) => r.level === "élevé" || r.level === "modéré",
  );
  const minor = risks.categories.filter(
    (r) => r.level === "faible" || r.level === "absent",
  );

  return (
    <View>
      {highlighted.map((risk) => (
        <View key={risk.code} style={pdfStyles.modereCard} wrap={false}>
          <View style={pdfStyles.modereHead}>
            <Text style={pdfStyles.moderePill}>{LEVEL_LABEL[risk.level] ?? risk.level}</Text>
            <Text style={pdfStyles.modereName}>{risk.name}</Text>
          </View>
          {risk.message && <Text style={pdfStyles.modereNote}>{risk.message}</Text>}
        </View>
      ))}

      {minor.length > 0 && (
        <>
          <Text style={pdfStyles.faiblesHeader}>
            Risques faibles
          </Text>
          <View style={pdfStyles.faiblesGrid}>
            {minor.map((risk) => (
              <View key={risk.code} style={pdfStyles.faibleItem}>
                <Text style={pdfStyles.faibleName}>{risk.name}</Text>
                <Text style={pdfStyles.faiblePill}>
                  {LEVEL_LABEL[risk.level] ?? risk.level}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
