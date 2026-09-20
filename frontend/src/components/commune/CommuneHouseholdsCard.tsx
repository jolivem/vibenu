import type { HouseholdsStats } from "@/server-modules/demographics/domain/insee-profile.types";
import { HouseholdsCharts } from "@/components/analysis/HouseholdsCard";
import type { InseeView } from "@/components/analysis/inseeChart";

/**
 * Composition des ménages de l'arrondissement face à la France — mêmes graphes que la
 * card d'analyse.
 */
export function CommuneHouseholdsCard({ view }: { view: InseeView<HouseholdsStats> }) {
  return (
    <section className="card">
      <h2>Ménages et familles</h2>
      <HouseholdsCharts view={view} />
      <p className="elections-footnote">
        Source : INSEE · Recensement de la population 2021 à l&apos;IRIS.
      </p>
    </section>
  );
}
