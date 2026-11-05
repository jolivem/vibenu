import Link from "next/link";
import type { CommuneSlugEntry } from "@/lib/commune-slugs";
import { analyzeUrlForCommune } from "@/lib/commune-routing";
import type { LigneVoisin } from "./cityComparison";
import { formatEur } from "./format";
import { createFormat } from "@/i18n/format";

const fr = createFormat("fr");

interface Props {
  commune: CommuneSlugEntry;
  /** La page courante en premier, puis ses voisins (`cityComparison.lignesVoisins`). */
  voisins: LigneVoisin[];
}

const loyer = (v: number | null) => (v === null ? "—" : `${fr.fixed(v, 1)} €/m²`);

/**
 * Maillage et conversion, en pied de page sous les deux colonnes : ce n'est pas du
 * contenu de rubrique, donc pas une entrée de sommaire.
 *
 * Les voisins sont comparés en chiffres plutôt que listés : une liste de liens était le même
 * bloc d'une page à l'autre, un tableau de prix, de loyers et de revenus ne l'est pas.
 */
export function CommuneRelatedLinks({ commune, voisins }: Props) {
  return (
    <section className="commune-related" id="autour">
      <h2 className="page-section-title">Arrondissements voisins</h2>

      {voisins.length > 1 && (
        <div className="commune-neighbours-wrap">
        <table className="commune-neighbours">
          <thead>
            <tr>
              <th scope="col">Arrondissement</th>
              <th scope="col">Achat (appart.)</th>
              <th scope="col">Loyer</th>
              <th scope="col">Revenu médian</th>
            </tr>
          </thead>
          <tbody>
            {voisins.map((v) => {
              const courant = v.entry.slug === commune.slug;
              return (
                <tr key={v.entry.slug} className={courant ? "is-current" : undefined}>
                  <th scope="row">
                    {courant ? v.entry.nomCourt : <Link href={`/commune/${v.entry.slug}`}>{v.entry.nomCourt}</Link>}
                  </th>
                  <td>{v.prix === null ? "—" : `${formatEur(v.prix)}/m²`}</td>
                  <td>{loyer(v.loyer)}</td>
                  <td>{formatEur(v.revenu)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}

      {/* Climat, air, risques et municipales se jouent à l'échelle de la ville : ils vivent
          sur le hub. Ce que l'analyse garde pour elle, c'est la maille de l'adresse. */}
      <div className="commune-cta-row">
        {commune.parentSlug && commune.parentNom && (
          <Link href={`/commune/${commune.parentSlug}`} className="commune-cta-btn">
            {commune.parentNom} : climat, air, risques, municipales →
          </Link>
        )}
        <Link href={analyzeUrlForCommune(commune)} className="commune-cta-btn">
          Analyser une adresse de {commune.nomCourt} →
        </Link>
        <Link href="/commune/methode">Méthode et sources</Link>
      </div>
    </section>
  );
}
