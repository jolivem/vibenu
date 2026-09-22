import Link from "next/link";
import type { RiskAnalysisDto } from "@/types/location-analysis";
import { RiskList } from "@/components/analysis/RisksCard";

/**
 * Les risques naturels et technologiques de la ville.
 *
 * Lus à l'échelle communale et non à l'adresse : interrogé au centre de la ville,
 * Géorisques décrirait un point, pas un territoire. C'est aussi ce qui rend la rubrique
 * pertinente ici et pas sur une page d'arrondissement, où elle recopierait la ville.
 */
export function CityHubRisksCard({
  risks,
  nomAffiche,
}: {
  risks: RiskAnalysisDto;
  nomAffiche: string;
}) {
  return (
    <section className="card">
      <h2>Risques naturels et technologiques à {nomAffiche}</h2>

      <RiskList risks={risks} />

      <p className="elections-footnote">
        Statuts relevés à l&apos;échelle de la commune : ils disent quels risques
        concernent {nomAffiche}, pas leur intensité à une adresse donnée. Pour un logement
        précis, <Link href="/">l&apos;analyse d&apos;adresse</Link> descend à la parcelle.
      </p>
      <p className="elections-footnote">
        Source : Géorisques · Ministère de la Transition écologique, BRGM.
      </p>
    </section>
  );
}
