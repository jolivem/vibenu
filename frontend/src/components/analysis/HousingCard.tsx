import type { AnalysisMode, DemographicsAnalysisDto } from "@/types/location-analysis";
import { DistributionChart } from "./DistributionChart";
import { IndicatorBlock } from "./IndicatorBlock";
import { scopedBarRows, StackedBarGroup } from "./StackedBar";
import { HOUSING_INDICATORS, dwellingSegments, occupancySegments } from "./populationIndicators";
import { viewForMode } from "./inseeChart";
import { CardInsight } from "@/components/CardInsight";

const ROOM_LABELS = ["1 p.", "2 p.", "3 p.", "4 p.", "5 p. et +"] as const;

const EPOCH_LABELS = ["<1919", "19-45", "46-70", "71-90", "91-05", "06-18"] as const;
const EPOCH_TITLES = [
  "Avant 1919",
  "1919-1945",
  "1946-1970",
  "1971-1990",
  "1991-2005",
  "2006-2018",
] as const;

interface Props {
  demographics: DemographicsAnalysisDto;
  mode: AnalysisMode;
  /** Mini-synthèse IA affichée sous le titre. Absente tant qu'elle n'est pas générée. */
  insight?: string | null;
}

/**
 * Le parc de logements du quartier : ce qu'on y habite, et à quel titre.
 *
 * Complément direct de la card Marché immobilier — celle-ci dit à quel prix on achète,
 * celle-là ce qui se loue, ce qui reste vide et ce qui a été bâti quand.
 */
export function HousingCard({ demographics, mode, insight }: Props) {
  const view = viewForMode(demographics.housing, mode, demographics);
  if (!view) return null;

  return (
    <section className="card">
      <h2>Logement</h2>

      <CardInsight text={insight} />

      {HOUSING_INDICATORS.map((indicator) => (
        <IndicatorBlock key={indicator.key} indicator={indicator} view={view} />
      ))}

      <div className="insee-metric">
        <h3>Statut d&apos;occupation</h3>
        <p className="metric-unit">en % des résidences principales</p>
        <StackedBarGroup rows={scopedBarRows(view, occupancySegments)} />
      </div>

      <div className="insee-metric">
        <h3>Type de logement</h3>
        <p className="metric-unit">en % du parc total</p>
        <StackedBarGroup rows={scopedBarRows(view, dwellingSegments)} />
        <p className="demographics-note">
          Les deux parts ne bouclent pas toujours à 100 % : l&apos;INSEE compte à part
          les logements qui ne sont ni maison ni appartement.
        </p>
      </div>

      <DistributionChart
        title="Nombre de pièces"
        unit="en % des résidences principales"
        view={view}
        pick={(s) => s.pieces}
        labels={ROOM_LABELS}
      />

      <DistributionChart
        title="Époque de construction"
        unit="en % des résidences principales achevées avant 2019"
        view={view}
        pick={(s) => s.epoques}
        labels={EPOCH_LABELS}
        titles={EPOCH_TITLES}
        note="L'INSEE ne ventile par période que les logements achevés avant 2019 : les plus récents ne figurent dans aucune tranche."
      />

      <p className="elections-footnote">
        Le parc de logements, recensé par l&apos;INSEE en 2021.
      </p>
      <p className="elections-footnote">
        Source : INSEE · Recensement de la population 2021, base logement à l&apos;IRIS.
        Les effectifs du recensement sont des estimations pondérées, arrondies à
        l&apos;unité : sur un petit quartier, les parts peuvent ne pas boucler
        exactement à 100 %.
      </p>
    </section>
  );
}
