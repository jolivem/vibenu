import { ChartLegend } from "./ChartLegend";
import { LINE_CHART_DIMENSIONS } from "./lineChart";
import { buildGroupedBarModel, splitLabel, type GroupedBarSeries } from "./groupedBarChart";

/**
 * Bâtons groupés : une catégorie par groupe, une couleur par échelle, la même que sur les
 * courbes voisines (vert pour le lieu consulté). SVG fait main, comme les autres graphes
 * de la page, avec les classes `.line-chart*` pour la grille et les axes.
 */
export function GroupedBarChart({
  series,
  categories,
  formatValue,
  formatTick,
  barTitle,
  ariaLabel,
}: {
  series: GroupedBarSeries[];
  categories: readonly string[];
  formatValue: (v: number) => string;
  formatTick: (v: number) => string;
  /** Infobulle d'un bâton : série, catégorie, valeur formatée. */
  barTitle: (series: string, category: string, value: string) => string;
  ariaLabel: string;
}) {
  const { W, H, padL, padR, padB } = LINE_CHART_DIMENSIONS;
  const model = buildGroupedBarModel(series, categories.length);
  const base = model.y(0);

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="line-chart-svg">
        {model.yTicks.map((t) => (
          <line key={t} x1={padL} x2={W - padR} y1={model.y(t)} y2={model.y(t)} className="line-chart-grid" />
        ))}
        {model.yTicks.map((t) => (
          <text key={t} x={padL - 4} y={model.y(t)} className="line-chart-axis line-chart-axis--y">
            {formatTick(t)}
          </text>
        ))}

        {categories.map((category, c) =>
          series.map((s, i) => {
            const v = s.values[c];
            if (v === null || v === undefined) return null;
            const top = model.y(v);
            return (
              <rect
                key={`${c}-${i}`}
                x={model.barX(c, i)}
                y={top}
                width={model.barWidth}
                height={Math.max(base - top, 0.5)}
                fill={s.color}
                rx={1.5}
              >
                <title>{barTitle(s.name, category, formatValue(v))}</title>
              </rect>
            );
          }),
        )}

        {categories.map((category, c) => {
          const lines = splitLabel(category);
          return (
            <text key={category} x={model.groupCenter(c)} y={H - padB + 13} className="line-chart-axis line-chart-axis--x">
              {lines.map((line, k) => (
                <tspan key={k} x={model.groupCenter(c)} dy={k === 0 ? 0 : 11}>
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}
      </svg>
      <ChartLegend items={series.map((s) => ({ name: s.name, color: s.color }))} />
    </div>
  );
}
