export interface ChartLegendItem {
  name: string;
  /**
   * Précision rattachée à l'item, en gris clair — le type de climat d'une ville de
   * référence. Le climat rendait sa légende à la main pour ce seul besoin.
   */
  detail?: string;
  /** Absent pour une pastille de bande, qui tire son style du CSS. */
  color?: string;
  /**
   * `band` rend le motif des zones d'incertitude, `hatch` celui d'un segment
   * résiduel : la légende doit distinguer « une courbe » d'« un encadrement » et
   * d'« un reste ».
   */
  swatch?: "dot" | "band" | "hatch";
}

/**
 * Légende partagée par tous les graphes de l'écran.
 *
 * `LineChart` ne rend pas sa propre légende : il ne connaît que des séries et des
 * échelles, et plusieurs cards en affichent une seule pour plusieurs graphes. Elle
 * était donc redessinée à l'identique par chaque appelant.
 */
export function ChartLegend({
  items,
  className,
  kind = "scales",
}: {
  items: ChartLegendItem[];
  className?: string;
  /**
   * Ce que les items désignent, ce qui n'est pas décoratif :
   *
   * - `scales` — des échelles : le lieu consulté d'abord, ses repères ensuite. Sa
   *   pastille est plus large, à l'image de sa courbe (trait de 2,8 contre 1,4, points
   *   deux fois plus larges). C'est cette hiérarchie, et non la teinte, qui tient en
   *   vision dichromate — cf. la note de `climateChart.ts` sur le rouge et le vert.
   * - `categories` — les parts d'une partition, de même rang. Y grossir la première
   *   pastille serait faux : « Propriétaires » ne domine pas « Locataires ».
   */
  kind?: "scales" | "categories";
}) {
  const classes = ["line-chart-legend"];
  if (kind === "scales") classes.push("line-chart-legend--scales");
  if (className) classes.push(className);

  return (
    <ul className={classes.join(" ")}>
      {items.map((item) => (
        <li key={item.name}>
          {item.swatch === "band" && <span className="line-chart-legend-band" />}
          {item.swatch === "hatch" && (
            <span className="line-chart-legend-dot stacked-bar-seg--residual" />
          )}
          {item.swatch !== "band" && item.swatch !== "hatch" && (
            <span className="line-chart-legend-dot" style={{ background: item.color }} />
          )}
          {item.name}
          {item.detail && <span className="line-chart-legend-detail"> · {item.detail}</span>}
        </li>
      ))}
    </ul>
  );
}
