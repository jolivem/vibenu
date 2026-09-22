import type { MunicipalesAnalysisDto } from "@/types/location-analysis";
import { MunicipalesLists } from "@/components/analysis/MunicipalesCard";
import { formatPct } from "./format";

/**
 * Le scrutin municipal, à la seule échelle où il existe.
 *
 * Sur une page d'arrondissement, ce résultat s'excuse d'être celui de la ville entière ;
 * ici il n'a rien à excuser — c'est la maille du conseil municipal, et celle qu'attend
 * qui cherche « qui a gagné les municipales ».
 */
export function CityHubMunicipalesCard({
  municipales,
  nomAffiche,
}: {
  municipales: MunicipalesAnalysisDto;
  nomAffiche: string;
}) {
  const { tour, participationPct, nuancee, listes } = municipales;

  return (
    <section className="card elections-card">
      <h2>
        Municipales 2026 à {nomAffiche} — {tour === 1 ? "1er" : "2e"} tour
      </h2>
      <p className="muted">Participation : {formatPct(participationPct / 100, 1)}</p>

      <MunicipalesLists listes={listes} nuancee={nuancee} />

      <p className="elections-footnote">
        Le conseil municipal est élu à l&apos;échelle de la ville entière : ce résultat
        vaut pour tous les arrondissements. Les conseils d&apos;arrondissement, eux, sont
        élus par secteur — un découpage qui ne se superpose pas aux arrondissements.
      </p>
      <p className="elections-footnote">
        Source : Ministère de l&apos;Intérieur · Résultats des élections municipales des 15
        et 22 mars 2026.
      </p>
    </section>
  );
}
