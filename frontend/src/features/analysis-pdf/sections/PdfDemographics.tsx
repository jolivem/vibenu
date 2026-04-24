import { Text, View } from "@react-pdf/renderer";
import type { DemographicsAnalysisDto } from "@/types/location-analysis";
import {
  formatDensity,
  formatPct,
  formatPopulation,
  formatRevenu,
} from "@/components/analysis/demographicsFormat";
import { pdfStyles } from "../pdfStyles";
import { AgeChartPdf } from "../AgeChartPdf";

export function PdfDemographics({ demographics }: { demographics: DemographicsAnalysisDto }) {
  const { communeStats, nationalStats, communeIrisCount } = demographics;
  const showCommune = communeIrisCount > 1 && communeStats !== null;
  const commune = showCommune ? communeStats : null;
  const france = nationalStats;

  const renderRow = (
    label: string,
    iris: string,
    communeValue: string | null,
    franceValue: string | null,
    isLast = false,
  ) => (
    <View style={isLast ? pdfStyles.tableRowLast : pdfStyles.tableRow}>
      <Text style={pdfStyles.tableCellLabel}>{label}</Text>
      <Text style={pdfStyles.tableCell}>{iris}</Text>
      {showCommune && <Text style={pdfStyles.tableCell}>{communeValue ?? "—"}</Text>}
      {france && <Text style={pdfStyles.tableCell}>{franceValue ?? "—"}</Text>}
    </View>
  );

  return (
    <View style={pdfStyles.card} wrap={false}>
      <Text style={pdfStyles.cardTitle}>Démographie</Text>
      <Text style={[pdfStyles.p, pdfStyles.muted]}>
        IRIS : {demographics.nomIris || demographics.codeIris}
        {demographics.nomCommune && ` — ${demographics.nomCommune}`}
      </Text>
      {!showCommune && demographics.nomCommune && (
        <Text style={[pdfStyles.p, pdfStyles.muted]}>
          IRIS unique pour cette commune — les chiffres IRIS et communaux sont identiques.
        </Text>
      )}

      <View style={pdfStyles.table}>
        <View style={pdfStyles.tableRow}>
          <Text style={pdfStyles.tableHeaderCell}>Indicateur</Text>
          <Text style={pdfStyles.tableHeaderCell}>IRIS</Text>
          {showCommune && <Text style={pdfStyles.tableHeaderCell}>Commune</Text>}
          {france && <Text style={pdfStyles.tableHeaderCell}>France</Text>}
        </View>
        {renderRow(
          "Population",
          formatPopulation(demographics.population),
          formatPopulation(commune?.population ?? null),
          formatPopulation(france?.population ?? null),
        )}
        {renderRow("Densité", formatDensity(demographics.density), "—", "—")}
        {renderRow(
          "Revenu médian",
          formatRevenu(demographics.revenuMedian),
          formatRevenu(commune?.revenuMedian ?? null),
          formatRevenu(france?.revenuMedian ?? null),
        )}
        {renderRow(
          "Taux de pauvreté",
          formatPct(demographics.tauxPauvrete),
          formatPct(commune?.tauxPauvrete ?? null),
          formatPct(france?.tauxPauvrete ?? null),
          true,
        )}
      </View>

      {demographics.ageDistribution && (
        <View>
          <Text style={pdfStyles.subtitle}>Répartition par âge</Text>
          <AgeChartPdf
            iris={demographics.ageDistribution}
            commune={commune?.ageDistribution ?? null}
            france={france?.ageDistribution ?? null}
            showCommune={showCommune}
          />
        </View>
      )}

      <Text style={[pdfStyles.small, { marginTop: 6 }]}>
        Commune et France : moyennes pondérées par population calculées à partir des IRIS (chiffres indicatifs).
      </Text>
    </View>
  );
}
