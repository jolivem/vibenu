import Link from "next/link";
import { getCommuneBySlug, type CommuneSlugEntry } from "@/lib/commune-slugs";
import { analyzeUrlForCommune } from "@/lib/commune-routing";

interface Props {
  commune: CommuneSlugEntry;
}

/**
 * Maillage et conversion, en pied de page sous les deux colonnes : ce n'est pas du
 * contenu, donc pas une entrée de sommaire.
 *
 * Le titre était « À proximité », qui entrait en collision frontale avec la rubrique des
 * équipements de proximité une fois les deux au sommaire.
 */
export function CommuneRelatedLinks({ commune }: Props) {
  const voisins = commune.voisins
    .map((slug) => getCommuneBySlug(slug))
    .filter((c): c is CommuneSlugEntry => c !== undefined);

  return (
    <section className="commune-related" id="autour">
      <h2 className="page-section-title">Arrondissements voisins</h2>

      {voisins.length > 0 && (
        <ul className="commune-related-list">
          {voisins.map((v) => (
            <li key={v.slug}>
              <Link href={`/commune/${v.slug}`}>{v.nomCourt}</Link>
            </li>
          ))}
        </ul>
      )}

      {/* Climat, risques et municipales se jouent à l'échelle de la ville : ils vivent
          désormais sur le hub, et non ici — d'où le lien ci-dessous. Ce que l'analyse
          garde pour elle, c'est la maille de l'adresse et la fiche PDF. */}
      {commune.parentSlug && commune.parentNom && (
        <div className="commune-cta">
          <p>
            Climat, risques naturels et résultats des municipales 2026 se lisent à
            l&apos;échelle de la ville : retrouvez-les sur la page {commune.parentNom}.
          </p>
          <Link href={`/commune/${commune.parentSlug}`} className="commune-cta-btn">
            {commune.parentNom} et ses arrondissements →
          </Link>
        </div>
      )}

      <div className="commune-cta">
        <p>
          Pour un logement précis — risques à la parcelle, carte scolaire, transports,
          fiche PDF : lancez l&apos;analyse détaillée de {commune.nomCourt}.
        </p>
        <Link href={analyzeUrlForCommune(commune)} className="commune-cta-btn">
          Analyse détaillée de {commune.nomCourt} →
        </Link>
      </div>
    </section>
  );
}
