import type { AnalysisMode, DemographicsAnalysisDto, HousingStatsDto } from "@/types/location-analysis";
import { DistributionChart } from "./DistributionChart";
import { ScopedStatsTable, type ScopedRow } from "./ScopedStatsTable";
import { scopedBarRows, StackedBarGroup } from "./StackedBar";
import { formatPct } from "./demographicsFormat";
import { STACK_COLORS, viewForMode } from "./inseeChart";
import { formatFr } from "@/lib/format";
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

const [OWNER, PRIVATE_RENT, SOCIAL_RENT, FREE] = STACK_COLORS;
const [HOUSE, FLAT] = STACK_COLORS;

const ROWS: ScopedRow<HousingStatsDto>[] = [
  { label: "Logements", render: (s) => (s.logements == null ? "—" : formatFr(s.logements)) },
  {
    label: "Résidences principales",
    render: (s) => (s.residencesPrincipales == null ? "—" : formatFr(s.residencesPrincipales)),
  },
  { label: "Logements vacants", render: (s) => formatPct(s.pctVacants) },
  { label: "Résidences secondaires", render: (s) => formatPct(s.pctResidencesSecondaires) },
];

function occupancySegments(s: HousingStatsDto) {
  return [
    { label: "Propriétaires", color: OWNER, value: s.pctProprietaires },
    { label: "Locataires du privé", color: PRIVATE_RENT, value: s.pctLocatairesPrives },
    { label: "Locataires HLM", color: SOCIAL_RENT, value: s.pctHlm },
    { label: "Logés gratuitement", color: FREE, value: s.pctLogesGratuitement },
  ];
}

function dwellingSegments(s: HousingStatsDto) {
  return [
    { label: "Maisons", color: HOUSE, value: s.pctMaisons },
    { label: "Appartements", color: FLAT, value: s.pctAppartements },
  ];
}

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
      <p className="muted">Le parc de logements, recensé par l&apos;INSEE en 2021.</p>

      <CardInsight text={insight} />

      <ScopedStatsTable view={view} rows={ROWS} />

      <div className="insee-metric">
        <h3>Statut d&apos;occupation</h3>
        <p className="insee-metric-unit">en % des résidences principales</p>
        <StackedBarGroup rows={scopedBarRows(view, occupancySegments)} />
      </div>

      <div className="insee-metric">
        <h3>Type de logement</h3>
        <p className="insee-metric-unit">en % du parc total</p>
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
        Source : INSEE · Recensement de la population 2021, base logement à l&apos;IRIS.
        Les effectifs du recensement sont des estimations pondérées, arrondies à
        l&apos;unité : sur un petit quartier, les parts peuvent ne pas boucler
        exactement à 100 %.
      </p>
    </section>
  );
}
