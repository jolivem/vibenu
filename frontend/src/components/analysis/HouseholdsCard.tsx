import type { AnalysisMode, DemographicsAnalysisDto, HouseholdsStatsDto } from "@/types/location-analysis";
import { DistributionChart } from "./DistributionChart";
import { IndicatorBlock } from "./IndicatorBlock";
import { scopedBarRows, StackedBarGroup } from "./StackedBar";
import { HOUSEHOLDS_INDICATORS, compositionSegments } from "./populationIndicators";
import { viewForMode, type InseeView } from "./inseeChart";
import { CardInsight } from "@/components/CardInsight";

const CHILDREN_LABELS = ["Aucun", "1", "2", "3", "4 et +"] as const;

interface Props {
  demographics: DemographicsAnalysisDto;
  mode: AnalysisMode;
  /** Mini-synthèse IA affichée sous le titre. Absente tant qu'elle n'est pas générée. */
  insight?: string | null;
}

/**
 * Composition des ménages : qui vit avec qui.
 *
 * C'est ce qui distingue le mieux un quartier de familles d'un quartier de jeunes
 * actifs — deux profils qu'un revenu médian identique masquerait entièrement.
 */
export function HouseholdsCard({ demographics, mode, insight }: Props) {
  const view = viewForMode(demographics.households, mode, demographics);
  if (!view) return null;

  return (
    <section className="card">
      <h2>Ménages et familles</h2>

      <CardInsight text={insight} />

      <HouseholdsCharts view={view} />

      <p className="elections-footnote">
        La composition des foyers, recensée par l&apos;INSEE en 2021.
      </p>
      <p className="elections-footnote">
        Source : INSEE · Recensement de la population 2021, base couples-familles-ménages
        à l&apos;IRIS. Un ménage est l&apos;ensemble des personnes d&apos;un même
        logement, qu&apos;elles aient ou non un lien de parenté.
      </p>
    </section>
  );
}

/**
 * Les indicateurs, la barre de composition et le graphe des enfants, sans le cadre ni les
 * notes de la card : les pages commune les reprennent tels quels.
 */
export function HouseholdsCharts({ view }: { view: InseeView<HouseholdsStatsDto> }) {
  return (
    <>
      {HOUSEHOLDS_INDICATORS.map((indicator) => (
        <IndicatorBlock key={indicator.key} indicator={indicator} view={view} />
      ))}

      <div className="insee-metric">
        <h3>Composition des ménages</h3>
        <p className="metric-unit">en % des ménages</p>
        <StackedBarGroup rows={scopedBarRows(view, compositionSegments)} />
      </div>

      <DistributionChart
        title="Enfants par famille"
        unit="en % des familles, enfants de moins de 25 ans"
        view={view}
        pick={(s) => s.enfantsParFamille}
        labels={CHILDREN_LABELS}
      />
    </>
  );
}
