import type { HousingStats } from "@/server-modules/demographics/domain/insee-profile.types";
import { HousingCharts } from "@/components/analysis/HousingCard";
import type { InseeView } from "@/components/analysis/inseeChart";
import { CardInsight } from "@/components/CardInsight";
import type { CommuneLegendes } from "@/server-modules/narrative/domain/commune-narrative.types";

/**
 * Le parc de logements de l'arrondissement face à la France — mêmes graphes que la card
 * d'analyse.
 *
 * Le titre nomme les trois sujets plutôt que « Logement » seul : c'est la card de la page
 * qui porte le plus de requêtes de recherche, et « propriétaires » ou « locataires » n'y
 * figureraient nulle part ailleurs.
 */
export function CommuneHousingCard({
  view,
  legendes,
}: {
  view: InseeView<HousingStats>;
  /** Légende IA de la card, rendue côté serveur. */
  legendes?: CommuneLegendes;
}) {
  return (
    <section className="card">
      <h2>Logement : parc, propriétaires et locataires</h2>

      <CardInsight text={legendes?.legende_logement} animate={false} />

      <HousingCharts view={view} />
      <p className="elections-footnote">
        Le parc de logements recensé par l&apos;INSEE en 2021. Les effectifs du recensement
        sont des estimations pondérées, arrondies à l&apos;unité : les parts peuvent ne pas
        boucler exactement à 100 %. Source : INSEE · Recensement de la population 2021,
        base logement à l&apos;IRIS.
      </p>
    </section>
  );
}
