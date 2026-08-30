import type { InseeView } from "./inseeChart";
import { ChartLegend } from "./ChartLegend";
import { formatPct } from "./demographicsFormat";

export interface StackedBarSegment {
  label: string;
  /** Absent pour un résidu, qui est rendu en texture plutôt qu'en couleur. */
  color?: string;
  /** Part en %, de 0 à 100. `null` = valeur absente : le segment n'est pas dessiné. */
  value: number | null;
  /**
   * « Tout le reste » : les ménages sans famille, les logements ni maison ni
   * appartement. Hachuré, pour dire que ce n'est pas une catégorie de même nature
   * que les autres — et pour ne pas consommer une teinte de la palette.
   */
  residual?: boolean;
}

/**
 * Barre empilée d'une partition, à une échelle.
 *
 * Pour les découpages sans ordre — statut d'occupation, composition des ménages —
 * que relier par une courbe suggérerait une progression inexistante. Les
 * répartitions ordonnées (nombre de pièces, époque, CSP, diplôme) restent des courbes.
 *
 * Les parts ne sont jamais renormalisées : les distributions INSEE laissent souvent
 * un résidu, et forcer la somme à 100 % inventerait de la donnée. La barre se remplit
 * donc à hauteur de ce que la source décrit, le reste laissant voir le fond.
 */
function Bar({ rowLabel, segments }: { rowLabel: string; segments: StackedBarSegment[] }) {
  const drawn = segments.filter((s) => s.value !== null && s.value > 0);
  const summary = drawn.map((s) => `${s.label} ${formatPct(s.value)}`).join(", ");

  return (
    <div className="stacked-bar-row">
      <span className="stacked-bar-label">{rowLabel}</span>
      <span className="stacked-bar" role="img" aria-label={`${rowLabel} : ${summary}`}>
        {drawn.map((s) => (
          // `title` en attribut, pas en élément : <title> n'existe qu'en SVG, et le
          // navigateur le sortirait du <span> en HTML.
          <span
            key={s.label}
            className={s.residual ? "stacked-bar-seg stacked-bar-seg--residual" : "stacked-bar-seg"}
            style={{ width: `${s.value}%`, background: s.color }}
            title={`${s.label} — ${formatPct(s.value)}`}
          />
        ))}
      </span>
    </div>
  );
}

export interface StackedBarRow {
  label: string;
  segments: StackedBarSegment[];
}

/**
 * Une barre par échelle affichée, dans l'ordre des colonnes du tableau voisin —
 * l'œil doit retrouver « quartier, commune, France » à la même place partout.
 */
export function scopedBarRows<T>(
  view: InseeView<T>,
  segments: (stats: T) => StackedBarSegment[],
): StackedBarRow[] {
  const scales: [string, T | null][] = [
    [view.localName, view.scoped.iris],
    ...(view.showCommune ? ([[view.communeName, view.scoped.commune]] as [string, T | null][]) : []),
    ["France", view.scoped.france],
  ];
  return scales
    .filter((entry): entry is [string, T] => entry[1] !== null)
    .map(([label, stats]) => ({ label, segments: segments(stats) }));
}

/**
 * Les mêmes segments pour plusieurs échelles, empilés et alignés, avec la légende
 * qui nomme les couleurs.
 *
 * La légende n'est pas optionnelle : sans elle, l'identité des segments ne tiendrait
 * qu'à l'infobulle au survol — invisible à l'impression, au clavier et pour un
 * lecteur d'écran.
 */
export function StackedBarGroup({ rows }: { rows: StackedBarRow[] }) {
  // Les libellés sont identiques d'une ligne à l'autre : la première suffit à décrire
  // la légende, y compris les segments qu'une échelle donnée n'a pas.
  const legend = rows[0]?.segments ?? [];

  return (
    <div className="stacked-bar-group">
      {rows.map((row) => (
        <Bar key={row.label} rowLabel={row.label} segments={row.segments} />
      ))}
      <ChartLegend
        className="stacked-bar-legend"
        items={legend.map((s) => ({
          name: s.label,
          color: s.color,
          swatch: s.residual ? ("hatch" as const) : ("dot" as const),
        }))}
      />
    </div>
  );
}
