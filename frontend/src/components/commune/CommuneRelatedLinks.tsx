import Link from "next/link";
import { getCommuneBySlug, type CommuneSlugEntry } from "@/lib/commune-slugs";

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
        <span className="section-num">07</span>
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

      <div className="commune-cta">
        <p>
          Vous cherchez une analyse précise pour une adresse dans {commune.nomCourt} ?
        </p>
        <Link href="/" className="commune-cta-btn">
          Analyser une adresse précise →
        </Link>
      </div>
    </section>
  );
}
