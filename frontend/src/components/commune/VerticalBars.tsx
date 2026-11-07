import Link from "next/link";

export interface VerticalBarRow {
  id: string;
  /** Sous la barre : « 6e » plutôt que « Paris 6e », vingt colonnes doivent tenir. */
  court: string;
  /** Nom complet, en infobulle. */
  nom: string;
  href?: string;
  valeur: number;
  /** Au-dessus de la barre, sans unité : « 14 124 ». */
  nombre: string;
  /** Avec l'unité, en infobulle : « 14 124 €/m² ». */
  texte: string;
}

export interface VerticalBarReference {
  id: string;
  valeur: number;
  /** « Paris (ensemble) : 9 697 €/m² ». */
  libelle: string;
}

/** Part de la hauteur laissée à la plus haute barre : le reste accueille son chiffre. */
const HAUTEUR_MAX = 72;

/**
 * Le classement d'un indicateur en colonnes, de la plus haute à la plus basse.
 *
 * En CSS plutôt qu'en SVG : les textes gardent leur taille réelle quel que soit l'écran, et
 * sous la largeur nécessaire le graphe défile dans son cadre au lieu de rétrécir. Axe à zéro,
 * une seule couleur ; les repères (ville, France) sont des lignes, pas des colonnes de plus,
 * nommées en légende sous le graphe : posé sur la ligne, le libellé masquait des chiffres.
 * Les chiffres sont dans le tableau qui suit : le graphe est masqué aux lecteurs d'écran.
 */
export function VerticalBars({
  rows,
  references = [],
  label,
}: {
  rows: VerticalBarRow[];
  references?: VerticalBarReference[];
  label: string;
}) {
  const triees = [...rows].sort((a, b) => b.valeur - a.valeur);
  const max = Math.max(...triees.map((r) => r.valeur), ...references.map((r) => r.valeur), 0);
  if (max <= 0) return null;
  const hauteur = (v: number) => `${(v / max) * HAUTEUR_MAX}%`;

  return (
    <figure className="vbars" aria-label={label}>
      <div className="vbars-scroll">
        <div className="vbars-inner" style={{ minWidth: `${triees.length * 13}px` }}>
          <div className="vbars-plot" aria-hidden="true">
            {triees.map((r) => (
              <div key={r.id} className="vbars-col" title={`${r.nom} : ${r.texte}`}>
                <span className="vbars-value">{r.nombre}</span>
                <span className="vbars-bar" style={{ height: hauteur(r.valeur) }} />
              </div>
            ))}
            {references.map((ref, i) => (
              <div
                key={ref.id}
                className={i > 0 ? "vbars-ref is-second" : "vbars-ref"}
                style={{ bottom: hauteur(ref.valeur) }}
              />
            ))}
          </div>
          <div className="vbars-labels">
            {triees.map((r) => (
              <span key={r.id} className="vbars-label">
                {r.href ? (
                  <Link href={r.href} title={r.nom}>
                    {r.court}
                  </Link>
                ) : (
                  r.court
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
      {references.length > 0 && (
        <ul className="vbars-legend">
          {references.map((ref, i) => (
            // Tirets pour le premier repère, points pour le second : la légende reprend le trait.
            <li key={ref.id} className={i > 0 ? "is-second" : undefined}>
              {ref.libelle}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
