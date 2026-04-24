import { Text, View } from "@react-pdf/renderer";
import type { RiskAnalysisDto, RiskCategoryDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

const LEVEL_LABEL: Record<RiskCategoryDto["level"], string> = {
  élevé: "Élevé",
  modéré: "Modéré",
  faible: "Faible",
  absent: "Absent",
};

const LEVEL_STYLE = {
  élevé: pdfStyles.badgeEleve,
  modéré: pdfStyles.badgeModere,
  faible: pdfStyles.badgeFaible,
  absent: pdfStyles.badgeAbsent,
} as const;

function RiskBadge({ level }: { level: RiskCategoryDto["level"] }) {
  return <Text style={[pdfStyles.badge, LEVEL_STYLE[level]]}>{LEVEL_LABEL[level]}</Text>;
}

export function PdfRisks({ risks }: { risks: RiskAnalysisDto }) {
  const highlighted = risks.categories.filter((r) => r.level === "élevé" || r.level === "modéré");
  const minor = risks.categories.filter((r) => r.level === "faible" || r.level === "absent");

  return (
    <View style={pdfStyles.card} wrap={false}>
      <Text style={pdfStyles.cardTitle}>Risques</Text>
      <View style={pdfStyles.riskRow}>
        <Text style={pdfStyles.p}>Niveau global : </Text>
        <RiskBadge level={risks.level} />
      </View>

      {highlighted.map((risk) => (
        <View key={risk.code} style={pdfStyles.riskHighlight}>
          <View style={pdfStyles.riskRow}>
            <RiskBadge level={risk.level} />
            <Text style={pdfStyles.p}>{risk.name}</Text>
          </View>
          <Text style={[pdfStyles.p, pdfStyles.small]}>{risk.message}</Text>
        </View>
      ))}

      {minor.map((risk) => (
        <View key={risk.code} style={pdfStyles.riskRow}>
          <RiskBadge level={risk.level} />
          <Text style={pdfStyles.p}>{risk.name}</Text>
        </View>
      ))}
    </View>
  );
}
