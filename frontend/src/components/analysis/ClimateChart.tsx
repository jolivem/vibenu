import type { ClimateMonthlySeriesDto } from "@/types/location-analysis";
import {
  CLIMATE_CHART_DIMENSIONS,
  MONTH_LABELS,
  MONTH_NAMES,
  buildClimateChartModel,
  type ClimateMetric,
} from "./climateChart";

interface Props {
  metric: ClimateMetric;
  label: string;
  unit: string;
  format: (n: number) => string;
  local: ClimateMonthlySeriesDto;
  references: ClimateMonthlySeriesDto[];
}

/**
 * Profil sur 12 mois d'une mesure climatique : la série locale et les villes de
 * référence, en courbes. Réutilise le graphe multi-séries de la répartition par âge
 * (classes `.line-chart*`), avec les mois en abscisse.
 *
 * Rend `null` si la série locale est vide — voir `buildClimateChartModel`.
 */
export function ClimateChart({ metric, label, unit, format, local, references }: Props) {
  const model = buildClimateChartModel({ metric, local, references });
  if (!model) return null;

  const { series, yTicks, x, y } = model;
  const { W, H, padL, padR, padB } = CLIMATE_CHART_DIMENSIONS;

  return (
    <div className="climate-metric">
      <h3>
        {label} <span className="climate-metric-unit">({unit})</span>
      </h3>
      <div className="line-chart">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${label} mois par mois — comparaison avec trois climats types`}
          className="line-chart-svg"
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="line-chart-grid" />
              <text x={padL - 4} y={y(t)} className="line-chart-axis line-chart-axis--y">
                {t.toLocaleString("fr-FR")}
              </text>
            </g>
          ))}

          {MONTH_LABELS.map((m, i) => (
            <text
              key={`${m}-${i}`}
              x={x(i)}
              y={H - padB + 14}
              className="line-chart-axis line-chart-axis--x"
            >
              {m}
            </text>
          ))}

          {series.map((s) => {
            // Une valeur manquante coupe la courbe plutôt que de la faire plonger à zéro.
            const points = s.values
              .map((v, i) => (v === null ? null : `${x(i)},${y(v)}`))
              .filter((p): p is string => p !== null)
              .join(" ");
            return (
              <g key={s.name} opacity={s.opacity}>
                <polyline
                  points={points}
                  stroke={s.color}
                  strokeWidth={s.strokeWidth}
                  fill="none"
                  className="line-chart-line"
                />
                {s.values.map((v, i) =>
                  v === null ? null : (
                    <circle key={i} cx={x(i)} cy={y(v)} r={s.dotRadius} fill={s.color}>
                      <title>{`${s.name} — ${MONTH_NAMES[i]} : ${format(v)}`}</title>
                    </circle>
                  ),
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
