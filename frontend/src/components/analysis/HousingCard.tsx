import type {
  AnalysisMode,
  DemographicsAnalysisDto,
  HousingStatsDto,
} from "@/types/location-analysis";
import { DistributionChart } from "./DistributionChart";
import { IndicatorBlock } from "./IndicatorBlock";
import { scopedBarRows, StackedBarGroup } from "./StackedBar";
import { HOUSING_INDICATORS, dwellingSegments, occupancySegments } from "./populationIndicators";
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
 * Le parc de logements du quartier : ce qu'on y habite, et à quel titre.
 *
 * Complément direct de la card Marché immobilier — celle-ci dit à quel prix on achète,
 * celle-là ce qui se loue, ce qui reste vide et ce qui a été bâti quand.
 */
export function HousingCard({ demographics, mode, m, insight }: Props) {
  const view = viewForMode(demographics.housing, mode, demographics, m);
  if (!view) return null;

  return (
    <section className="card">
      <h2>{m.housing.title}</h2>

      <CardInsight text={insight} />

      <HousingCharts view={view} />

      <p className="elections-footnote">{m.housing.footnote}</p>
    </section>
  );
}

/**
 * Les indicateurs et les quatre graphes de la card, sans son cadre ni ses notes : les pages
 * commune les reprennent tels quels, avec leurs propres sources.
 */
export function HousingCharts({ view }: { view: InseeView<HousingStatsDto> }) {
  const m = view.m.housing;
  return (
    <>
      {HOUSING_INDICATORS.map((indicator) => (
        <IndicatorBlock key={indicator.key} indicator={indicator} view={view} />
      ))}

      <div className="insee-metric">
        <h3>{m.occupancyTitle}</h3>
        <p className="metric-unit">{m.occupancyUnit}</p>
        <StackedBarGroup rows={scopedBarRows(view, occupancySegments)} m={view.m} />
      </div>

      <div className="insee-metric">
        <h3>{m.dwellingTitle}</h3>
        <p className="metric-unit">{m.dwellingUnit}</p>
        <StackedBarGroup rows={scopedBarRows(view, dwellingSegments)} m={view.m} />
        <p className="demographics-note">{m.dwellingNote}</p>
      </div>

      <DistributionChart
        title={m.roomsTitle}
        unit={m.roomsUnit}
        view={view}
        pick={(s) => s.pieces}
        labels={m.roomLabels}
      />

      <DistributionChart
        title={m.epochTitle}
        unit={m.epochUnit}
        view={view}
        pick={(s) => s.epoques}
        labels={m.epochLabels}
        titles={m.epochTitles}
        note={m.epochNote}
      />
    </>
  );
}
