import type { HouseholdsStats } from "@/server-modules/demographics/domain/insee-profile.types";
import { HouseholdsCharts } from "@/components/analysis/HouseholdsCard";
import type { InseeView } from "@/components/analysis/inseeChart";
import { CardInsight } from "@/components/CardInsight";
import type { CommuneLegendes } from "@/server-modules/narrative/domain/commune-narrative.types";

/**
 * Composition des ménages de l'arrondissement face à la France — mêmes graphes que la
 * card d'analyse.
 */
export function CommuneHouseholdsCard({
  view,
  legendes,
}: {
  view: InseeView<HouseholdsStats>;
  /** Légende IA de la card, rendue côté serveur. */
  legendes?: CommuneLegendes;
}) {
  return (
    <section className="card">
      <h2>Ménages et familles</h2>

      <CardInsight text={legendes?.legende_menages} animate={false} />

      <HouseholdsCharts view={view} />
      <p className="elections-footnote">
        Source : INSEE · Recensement de la population 2021 à l&apos;IRIS.
      </p>
    </section>
  );
}
