import type { AnalysisMode, DemographicsAnalysisDto, HouseholdsStatsDto } from "@/types/location-analysis";
import { DistributionChart } from "./DistributionChart";
import { IndicatorBlock } from "./IndicatorBlock";
import { scopedBarRows, StackedBarGroup } from "./StackedBar";
import { HOUSEHOLDS_INDICATORS, compositionSegments } from "./populationIndicators";
import { viewForMode, type InseeView } from "./inseeChart";
import { CardInsight } from "@/components/CardInsight";
import type { PopulationMessages } from "@/i18n/messages/fr/analysis/population";

interface Props {
  demographics: DemographicsAnalysisDto;
  mode: AnalysisMode;
  m: PopulationMessages;
  /** Mini-synthèse IA affichée sous le titre. Absente tant qu'elle n'est pas générée. */
  insight?: string | null;
}

/**
 * Composition des ménages : qui vit avec qui.
 *
 * C'est ce qui distingue le mieux un quartier de familles d'un quartier de jeunes
 * actifs — deux profils qu'un revenu médian identique masquerait entièrement.
 */
export function HouseholdsCard({ demographics, mode, m, insight }: Props) {
  const view = viewForMode(demographics.households, mode, demographics, m);
  if (!view) return null;

  return (
    <section className="card">
      <h2>{m.households.title}</h2>

      <CardInsight text={insight} />

      <HouseholdsCharts view={view} />

      <p className="elections-footnote">{m.households.footnote}</p>
    </section>
  );
}

/**
 * Les indicateurs, la barre de composition et le graphe des enfants, sans le cadre ni les
 * notes de la card : les pages commune les reprennent tels quels.
 */
export function HouseholdsCharts({ view }: { view: InseeView<HouseholdsStatsDto> }) {
  const m = view.m.households;
  return (
    <>
      {HOUSEHOLDS_INDICATORS.map((indicator) => (
        <IndicatorBlock key={indicator.key} indicator={indicator} view={view} />
      ))}

      <div className="insee-metric">
        <h3>{m.compositionTitle}</h3>
        <p className="metric-unit">{m.compositionUnit}</p>
        <StackedBarGroup rows={scopedBarRows(view, compositionSegments)} m={view.m} />
      </div>

      <DistributionChart
        title={m.childrenTitle}
        unit={m.childrenUnit}
        view={view}
        pick={(s) => s.enfantsParFamille}
        labels={m.childrenLabels}
      />
    </>
  );
}
