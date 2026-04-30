import { Text, View } from "@react-pdf/renderer";
import type { RiskAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

const LEVEL_LABEL: Record<string, string> = {
  élevé: "Élevé",
  modéré: "Modéré",
  faible: "Faible",
  absent: "Absent",
};

function highlightCopy(level: string, count: number, total: number): string {
  if (level === "élevé") {
    return `Un risque élevé identifié. À investiguer en priorité avant tout engagement.`;
  }
  if (level === "modéré") {
    const others = total - count;
    return `${count} risque${count > 1 ? "s" : ""} demande${count > 1 ? "nt" : ""} attention, ${others} ${others > 1 ? "sont" : "est"} faible${others > 1 ? "s" : ""}.`;
  }
  return `Aucun risque préoccupant identifié sur ce secteur.`;
}

export function PdfRisks({ risks }: { risks: RiskAnalysisDto }) {
  const highlighted = risks.categories.filter(
    (r) => r.level === "élevé" || r.level === "modéré",
  );
  const minor = risks.categories.filter(
    (r) => r.level === "faible" || r.level === "absent",
  );
  const globalLabel = LEVEL_LABEL[risks.level] ?? risks.level;

  return (
    <View>
      <View style={pdfStyles.globalRisk} wrap={false}>
        <View style={pdfStyles.globalRiskLeft}>
          <Text style={pdfStyles.globalRiskLabel}>Niveau global</Text>
          <Text style={pdfStyles.globalRiskValue}>{globalLabel}</Text>
        </View>
        <View style={pdfStyles.globalRiskRight}>
          <Text style={pdfStyles.globalRiskRightText}>
            {highlightCopy(risks.level, highlighted.length, risks.categories.length)}
          </Text>
        </View>
      </View>

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
            {minor.length} risque{minor.length > 1 ? "s" : ""} faible{minor.length > 1 ? "s" : ""}
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
