import Link from "next/link";
import { getCommuneBySlug, type CommuneSlugEntry } from "@/lib/commune-slugs";
import { analyzeUrlForCommune } from "@/lib/commune-routing";

interface Props {
  commune: CommuneSlugEntry;
}

export function CommuneRelatedLinks({ commune }: Props) {
  const voisins = commune.voisins
    .map((slug) => getCommuneBySlug(slug))
    .filter((c): c is CommuneSlugEntry => c !== undefined);

  return (
    <section className="commune-section commune-related" id="autour">
      <div className="commune-section-head">
        <h2 className="commune-section-title">
          À <i>proximité</i>
        </h2>
        <span className="section-meta">Arrondissements limitrophes</span>
      </div>

      {voisins.length > 0 && (
        <ul className="commune-related-list">
          {voisins.map((v) => (
            <li key={v.slug}>
              <Link href={`/commune/${v.slug}`}>{v.nomCourt}</Link>
            </li>
          ))}
        </ul>
      )}

      {/* L'analyse en mode commune couvre ce que cette page n'a pas encore — climat,
          risques, municipales — et produit le PDF. Cf. CLAUDE.md, « Commune mode vs SEO
          commune pages ». */}
      <div className="commune-cta">
        <p>
          Climat, risques naturels, élections municipales, fiche PDF : retrouvez
          l&apos;analyse complète de {commune.nomCourt}.
        </p>
        <Link href={analyzeUrlForCommune(commune)} className="commune-cta-btn">
          Analyse détaillée de {commune.nomCourt} →
        </Link>
      </div>
    </section>
  );
}
