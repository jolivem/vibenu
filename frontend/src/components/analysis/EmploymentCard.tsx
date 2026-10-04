import type { AnalysisMode, DemographicsAnalysisDto, EmploymentStatsDto } from "@/types/location-analysis";
import { DistributionChart } from "./DistributionChart";
import { IndicatorBlock } from "./IndicatorBlock";
import { EMPLOYMENT_INDICATORS } from "./populationIndicators";
import { viewForMode, type InseeView } from "./inseeChart";
import { CardInsight } from "@/components/CardInsight";
import { RichText } from "@/components/RichText";
import type { PopulationMessages } from "@/i18n/messages/fr/analysis/population";

interface Props {
  demographics: DemographicsAnalysisDto;
  mode: AnalysisMode;
  m: PopulationMessages;
  /** Mini-synthèse IA affichée sous le titre. Absente tant qu'elle n'est pas générée. */
  insight?: string | null;
}

/**
 * Emploi et qualifications des habitants.
 *
 * Deux précautions portées à l'écran plutôt que tues : le chômage du recensement n'est
 * pas le chômage au sens du BIT, et les diplômes ne portent que sur les personnes
 * ayant fini leurs études. Même exigence que le « faits enregistrés » de la card
 * Sécurité — un chiffre présenté sans sa définition se compare de travers.
 */
export function EmploymentCard({ demographics, mode, m, insight }: Props) {
  const view = viewForMode(demographics.employment, mode, demographics, m);
  if (!view) return null;

  return (
    <section className="card">
      <h2>{m.employment.title}</h2>
      <CardInsight text={insight} />

      <EmploymentCharts view={view} />

      <p className="elections-footnote">
        <RichText text={m.employment.footnote} />
      </p>
    </section>
  );
}

/**
 * Les indicateurs et les deux graphes de la card, sans son cadre ni ses notes : les pages
 * commune les reprennent tels quels, avec leurs propres sources.
 */
export function EmploymentCharts({ view }: { view: InseeView<EmploymentStatsDto> }) {
  const m = view.m.employment;
  return (
    <>
      {EMPLOYMENT_INDICATORS.map((indicator) => (
        <IndicatorBlock key={indicator.key} indicator={indicator} view={view} />
      ))}

      <DistributionChart
        title={m.cspTitle}
        unit={m.cspUnit}
        view={view}
        pick={(s) => s.csp}
        labels={m.cspLabels}
        titles={m.cspTitles}
        note={m.cspNote}
      />

      <DistributionChart
        title={m.diplomaTitle}
        unit={m.diplomaUnit}
        view={view}
        pick={(s) => s.diplomes}
        labels={m.diplomaLabels}
        titles={m.diplomaTitles}
      />
    </>
  );
}
