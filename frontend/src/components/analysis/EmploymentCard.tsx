import type { AnalysisMode, DemographicsAnalysisDto, EmploymentStatsDto } from "@/types/location-analysis";
import { DistributionChart } from "./DistributionChart";
import { ScopedStatsTable, type ScopedRow } from "./ScopedStatsTable";
import { formatPct } from "./demographicsFormat";
import { viewForMode } from "./inseeChart";

const CSP_LABELS = ["Agri.", "Artis.", "Cadres", "Interm.", "Employés", "Ouvriers"] as const;
const CSP_TITLES = [
  "Agriculteurs exploitants",
  "Artisans, commerçants, chefs d'entreprise",
  "Cadres et professions intellectuelles supérieures",
  "Professions intermédiaires",
  "Employés",
  "Ouvriers",
] as const;

const DIPLOMA_LABELS = ["Aucun", "BEPC", "CAP-BEP", "Bac", "+2", "+3/4", "+5"] as const;
const DIPLOMA_TITLES = [
  "Sans diplôme ou certificat d'études primaires",
  "BEPC, brevet des collèges",
  "CAP ou BEP",
  "Baccalauréat",
  "Bac + 2",
  "Bac + 3 ou + 4",
  "Bac + 5 ou plus",
] as const;

const ROWS: ScopedRow<EmploymentStatsDto>[] = [
  { label: "Taux de chômage", render: (s) => formatPct(s.tauxChomage) },
  { label: "Taux d'activité", render: (s) => formatPct(s.tauxActivite) },
  { label: "Diplômés du supérieur", render: (s) => formatPct(s.pctDiplomesSuperieur) },
];

interface Props {
  demographics: DemographicsAnalysisDto;
  mode: AnalysisMode;
}

/**
 * Emploi et qualifications des habitants.
 *
 * Deux précautions portées à l'écran plutôt que tues : le chômage du recensement n'est
 * pas le chômage au sens du BIT, et les diplômes ne portent que sur les personnes
 * ayant fini leurs études. Même exigence que le « faits enregistrés » de la card
 * Sécurité — un chiffre présenté sans sa définition se compare de travers.
 */
export function EmploymentCard({ demographics, mode }: Props) {
  const view = viewForMode(demographics.employment, mode, demographics);
  if (!view) return null;

  return (
    <section className="card">
      <h2>Emploi et qualifications</h2>
      <p className="muted">
        Ce que font et ce qu&apos;ont étudié les habitants, recensés par l&apos;INSEE en
        2021.
      </p>

      <ScopedStatsTable view={view} rows={ROWS} />
      <p className="demographics-note">
        Chômage et activité rapportés aux 15-64 ans ; diplômés du supérieur, aux
        personnes de 15 ans ou plus ayant terminé leurs études.
      </p>

      <DistributionChart
        title="Catégories socioprofessionnelles"
        unit="en % des actifs occupés"
        view={view}
        pick={(s) => s.csp}
        labels={CSP_LABELS}
        titles={CSP_TITLES}
        note="Les actifs occupés seuls : la catégorie d'un chômeur est celle de son dernier emploi, elle redirait ce que dit déjà le taux de chômage."
      />

      <DistributionChart
        title="Niveau de diplôme"
        unit="en % des 15 ans et plus non scolarisés"
        view={view}
        pick={(s) => s.diplomes}
        labels={DIPLOMA_LABELS}
        titles={DIPLOMA_TITLES}
      />

      <p className="elections-footnote">
        Le taux de chômage du recensement est <strong>déclaratif</strong> : il compte
        les personnes qui se déclarent au chômage, et non celles que le Bureau
        international du travail recense comme telles. Il est structurellement d&apos;un
        à deux points au-dessus du taux publié chaque trimestre, et ne s&apos;y compare
        pas.
      </p>
      <p className="elections-footnote">
        Source : INSEE · Recensement de la population 2021, bases activité des résidents
        et diplômes-formation à l&apos;IRIS.
      </p>
    </section>
  );
}
