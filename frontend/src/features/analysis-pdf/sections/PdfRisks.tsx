import { Text, View } from "@react-pdf/renderer";
import type { RiskAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

const LEVEL_LABEL: Record<string, string> = {
  élevé: "Élevé",
  modéré: "Modéré",
  présent: "Signalé",
  faible: "Faible",
  inconnu: "Non renseigné",
  absent: "Absent",
};

export function PdfRisks({ risks }: { risks: RiskAnalysisDto }) {
  // Même répartition que `RisksCard`, pour que l'export dise ce que dit l'écran.
  const highlighted = risks.categories.filter(
    (r) => r.level === "élevé" || r.level === "modéré" || r.level === "présent",
  );
  const minor = risks.categories.filter(
    (r) => r.level === "faible" || r.level === "inconnu",
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
          {/* « Autres risques » et non « Risques faibles » : le groupe accueille aussi
              les catégories non renseignées, qui ne sont pas faibles. */}
          <Text style={pdfStyles.faiblesHeader}>
            Autres risques
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
