import type { AnalysisMode, DemographicsAnalysisDto, HouseholdsStatsDto } from "@/types/location-analysis";
import { DistributionChart } from "./DistributionChart";
import { IndicatorBlock, absoluteComparison, type Indicator } from "./IndicatorBlock";
import { scopedBarRows, StackedBarGroup } from "./StackedBar";
import { formatPct } from "./demographicsFormat";
import { STACK_COLORS, viewForMode } from "./inseeChart";
import { CardInsight } from "@/components/CardInsight";

const CHILDREN_LABELS = ["Aucun", "1", "2", "3", "4 et +"] as const;

/** Du foyer d'une personne à la famille nombreuse ; le reste est hachuré. */
const [ALONE, COUPLE, FAMILY, SINGLE_PARENT] = STACK_COLORS;

/** « 1,81 pers. » — deux décimales, comme les publications INSEE sur la taille des ménages. */
function formatPersonnes(value: number): string {
  return `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pers.`;
}

/**
 * Les trois mesures scalaires de la card, chacune dans son bloc titré.
 *
 * Le nombre de ménages n'y figure plus : c'est un effectif, qui ne se compare pas — les
 * 30 millions de ménages français ne sont pas un repère pour un quartier — et qui ne
 * disait rien de la composition, seul sujet de la card.
 */
const INDICATORS: Array<Indicator<HouseholdsStatsDto>> = [
  {
    key: "taille",
    title: "Taille moyenne des ménages",
    unit: "personnes par ménage",
    pick: (s) => s.tailleMoyenne,
    format: formatPersonnes,
    // Une taille de ménage s'écarte en personnes, pas en points de pourcentage.
    comparison: absoluteComparison(formatPersonnes),
  },
  {
    key: "seules",
    title: "Personnes seules",
    unit: "en % des ménages",
    pick: (s) => s.pctPersonnesSeules,
    format: formatPct,
  },
  {
    key: "monoparentales",
    title: "Familles monoparentales",
    unit: "en % des ménages",
    pick: (s) => s.pctFamillesMonoparentales,
    format: formatPct,
  },
];

function compositionSegments(s: HouseholdsStatsDto) {
  return [
    { label: "Personne seule", color: ALONE, value: s.pctPersonnesSeules },
    { label: "Couple sans enfant", color: COUPLE, value: s.pctCouplesSansEnfant },
    { label: "Couple avec enfants", color: FAMILY, value: s.pctCouplesAvecEnfants },
    { label: "Famille monoparentale", color: SINGLE_PARENT, value: s.pctFamillesMonoparentales },
    { label: "Autres ménages", value: s.pctAutresMenages, residual: true },
  ];
}

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
      <p className="muted">
        La composition des foyers, recensée par l&apos;INSEE en 2021.
      </p>

      <CardInsight text={insight} />

      {INDICATORS.map((indicator) => (
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

      <p className="elections-footnote">
        Source : INSEE · Recensement de la population 2021, base couples-familles-ménages
        à l&apos;IRIS. Un ménage est l&apos;ensemble des personnes d&apos;un même
        logement, qu&apos;elles aient ou non un lien de parenté.
      </p>
    </section>
  );
}
