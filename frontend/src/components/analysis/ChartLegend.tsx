export interface ChartLegendItem {
  name: string;
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
}: {
  items: ChartLegendItem[];
  className?: string;
}) {
  return (
    <ul className={className ? `line-chart-legend ${className}` : "line-chart-legend"}>
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
        </li>
      ))}
    </ul>
  );
}
