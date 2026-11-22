import Link from "next/link";

export interface BarreHorizontale {
  id: string;
  /** Nom du lieu, à gauche. */
  libelle: string;
  /** Précision sous le nom (département, station…), en plus petit. */
  precision?: string;
  href?: string;
  valeur: number;
  /** Valeur formatée avec son unité, à droite de la barre. */
  texte: string;
  /** Met la ligne en évidence (la ville dont parle le paragraphe, par exemple). */
  souligne?: boolean;
}

/**
 * Un classement en barres horizontales, pour des libellés longs (noms de commune) que les
 * colonnes de `VerticalBars` ne peuvent pas porter.
 *
 * En CSS, comme `VerticalBars` : les textes gardent leur taille, la liste se lit sans
 * JavaScript et reste dans le HTML indexé. Axe à zéro, une seule couleur ; le repère
 * (médiane, France) est une ligne verticale nommée en légende. Les rangées arrivent dans
 * l'ordre voulu, déjà formatées.
 */
export function BarresHorizontales({
  titre,
  rangees,
  repere,
}: {
  titre: string;
  rangees: BarreHorizontale[];
  repere?: { valeur: number; libelle: string };
}) {
  const max = Math.max(...rangees.map((r) => r.valeur), repere?.valeur ?? 0, 0);
  if (max <= 0) return null;
  const pct = (v: number) => `${(v / max) * 100}%`;

  return (
    <figure className="hbars">
      <figcaption className="hbars-titre">{titre}</figcaption>
      <ol className="hbars-liste">
        {rangees.map((r) => (
          <li key={r.id} className={r.souligne ? "hbars-ligne is-souligne" : "hbars-ligne"}>
            <span className="hbars-libelle">
              {r.href ? <Link href={r.href}>{r.libelle}</Link> : r.libelle}
              {r.precision && <span className="hbars-precision">{r.precision}</span>}
            </span>
            <span className="hbars-piste">
              <span className="hbars-barre" style={{ width: pct(r.valeur) }} />
              {repere && <span className="hbars-repere" style={{ left: pct(repere.valeur) }} aria-hidden="true" />}
            </span>
            <span className="hbars-valeur">{r.texte}</span>
          </li>
        ))}
      </ol>
      {repere && <p className="hbars-legende">{repere.libelle}</p>}
    </figure>
  );
}
