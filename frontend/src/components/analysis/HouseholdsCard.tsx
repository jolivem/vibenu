import type { AnalysisMode, DemographicsAnalysisDto, HouseholdsStatsDto } from "@/types/location-analysis";
import { DistributionChart } from "./DistributionChart";
import { ScopedStatsTable, type ScopedRow } from "./ScopedStatsTable";
import { scopedBarRows, StackedBarGroup } from "./StackedBar";
import { formatPct } from "./demographicsFormat";
import { STACK_COLORS, viewForMode } from "./inseeChart";
import { formatFr } from "@/lib/format";
import { CardInsight } from "@/components/CardInsight";

const CHILDREN_LABELS = ["Aucun", "1", "2", "3", "4 et +"] as const;

/** Du foyer d'une personne à la famille nombreuse ; le reste est hachuré. */
const [ALONE, COUPLE, FAMILY, SINGLE_PARENT] = STACK_COLORS;

const ROWS: ScopedRow<HouseholdsStatsDto>[] = [
  { label: "Ménages", render: (s) => (s.nombreMenages == null ? "—" : formatFr(s.nombreMenages)) },
  {
    label: "Taille moyenne",
    render: (s) =>
      s.tailleMoyenne == null
        ? "—"
        : `${s.tailleMoyenne.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} pers.`,
  },
  { label: "Personnes seules", render: (s) => formatPct(s.pctPersonnesSeules) },
  { label: "Familles monoparentales", render: (s) => formatPct(s.pctFamillesMonoparentales) },
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

      <ScopedStatsTable view={view} rows={ROWS} />

      <div className="insee-metric">
        <h3>Composition des ménages</h3>
        <p className="insee-metric-unit">en % des ménages</p>
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
