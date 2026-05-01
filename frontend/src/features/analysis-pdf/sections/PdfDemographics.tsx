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

  const rows: Array<{ label: string; iris: string; commune: string; france: string }> = [
    {
      label: "Population",
      iris: formatPopulation(demographics.population),
      commune: formatPopulation(commune?.population ?? null),
      france: formatPopulation(france?.population ?? null),
    },
    {
      label: "Densité",
      iris: formatDensity(demographics.density),
      commune: "—",
      france: "—",
    },
    {
      label: "Revenu médian",
      iris: formatRevenu(demographics.revenuMedian),
      commune: formatRevenu(commune?.revenuMedian ?? null),
      france: formatRevenu(france?.revenuMedian ?? null),
    },
    {
      label: "Taux de pauvreté",
      iris: formatPct(demographics.tauxPauvrete),
      commune: formatPct(commune?.tauxPauvrete ?? null),
      france: formatPct(france?.tauxPauvrete ?? null),
    },
  ];

  return (
    <View>
      <Text style={pdfStyles.demoIris}>
        Zone · {demographics.nomIris || demographics.codeIris}
        {demographics.nomCommune && ` — ${demographics.nomCommune}`}
      </Text>

      <View style={pdfStyles.demoTable}>
        <View style={pdfStyles.demoTableHead}>
          <Text style={pdfStyles.demoTableHeadCellFirst}>Indicateur</Text>
          <Text style={pdfStyles.demoTableHeadCell}>Zone</Text>
          {showCommune && <Text style={pdfStyles.demoTableHeadCell}>Commune</Text>}
          {france && <Text style={pdfStyles.demoTableHeadCell}>France</Text>}
        </View>
        {rows.map((row) => (
          <View key={row.label} style={pdfStyles.demoTableRow}>
            <Text style={pdfStyles.demoTableCellLabel}>{row.label}</Text>
            <Text style={pdfStyles.demoTableCellIris}>{row.iris}</Text>
            {showCommune && (
              <Text style={pdfStyles.demoTableCell}>{row.commune}</Text>
            )}
            {france && (
              <Text style={pdfStyles.demoTableCell}>{row.france}</Text>
            )}
          </View>
        ))}
      </View>

      {demographics.ageDistribution && (
        <View style={pdfStyles.chartWrap} wrap={false}>
          <Text style={pdfStyles.chartHead}>Répartition par âge</Text>
          <AgeChartPdf
            iris={demographics.ageDistribution}
            commune={commune?.ageDistribution ?? null}
            france={france?.ageDistribution ?? null}
            showCommune={showCommune}
          />
          <Text style={pdfStyles.chartNote}>
            Commune et France : moyennes pondérées par population calculées à partir des
            zones démographiques (chiffres indicatifs).
          </Text>
        </View>
      )}
    </View>
  );
}
