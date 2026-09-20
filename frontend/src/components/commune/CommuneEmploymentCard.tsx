import type { EmploymentStats } from "@/server-modules/demographics/domain/insee-profile.types";
import { EmploymentCharts } from "@/components/analysis/EmploymentCard";
import type { InseeView } from "@/components/analysis/inseeChart";

/**
 * Emploi et qualifications de l'arrondissement face à la France — les graphes de la card
 * d'analyse, repris tels quels.
 */
export function CommuneEmploymentCard({ view }: { view: InseeView<EmploymentStats> }) {
  return (
    <section className="card">
      <h2>Emploi et qualifications</h2>
      <EmploymentCharts view={view} />
      <p className="elections-footnote">
        Le taux de chômage du recensement est <strong>déclaratif</strong> : il est
        structurellement d&apos;un à deux points au-dessus du taux publié chaque trimestre,
        et ne s&apos;y compare pas. Source : INSEE · Recensement de la population 2021 à
        l&apos;IRIS.
      </p>
    </section>
  );
}
