import type { EmploymentStats } from "@/server-modules/demographics/domain/insee-profile.types";
import { EmploymentCharts } from "@/components/analysis/EmploymentCard";
import type { InseeView } from "@/components/analysis/inseeChart";
import { CardInsight } from "@/components/CardInsight";
import type { CommuneLegendes } from "@/server-modules/narrative/domain/commune-narrative.types";
import { SourceLine } from "./SourceLine";

/**
 * Emploi et qualifications de l'arrondissement face à la France — les graphes de la card
 * d'analyse, repris tels quels.
 */
export function CommuneEmploymentCard({
  view,
  legendes,
}: {
  view: InseeView<EmploymentStats>;
  /** Légende IA de la card, rendue côté serveur. */
  legendes?: CommuneLegendes;
}) {
  return (
    <section className="card">
      <h2>Emploi et qualifications</h2>

      <CardInsight text={legendes?.legende_emploi} animate={false} />

      <EmploymentCharts view={view} />
      <SourceLine anchor="emploi">INSEE, recensement 2021 (chômage déclaré)</SourceLine>
    </section>
  );
}
