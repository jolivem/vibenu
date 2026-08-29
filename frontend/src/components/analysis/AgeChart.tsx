import type { AgeDistributionDto } from "@/types/location-analysis";
import { AGE_BUCKETS, AGE_CHART_DIMENSIONS, buildAgeChartModel } from "./ageChart";

interface Props {
  iris: AgeDistributionDto;
  commune?: AgeDistributionDto | null;
  france?: AgeDistributionDto | null;
  showCommune?: boolean;
  mainSeriesName?: string;
}

/**
 * Affiche la répartition par tranche d'âge sous forme de courbes multi-séries.
 * Réutilisé en mode adresse (quartier IRIS vs commune vs France) et en mode commune
 * (arrondissement vs France).
 */
export function AgeChart({
  iris,
  commune = null,
  france = null,
  showCommune = false,
  mainSeriesName = "Quartier",
}: Props) {
  const { series, yTicks, x, y } = buildAgeChartModel({
    iris,
    commune,
    france,
    showCommune,
    mainSeriesName,
  });
  const { W, H, padL, padR, padB } = AGE_CHART_DIMENSIONS;

  return (
    <div className="line-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Répartition par âge — comparaison multi-séries"
        className="line-chart-svg"
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="line-chart-grid" />
            <text x={padL - 4} y={y(t)} className="line-chart-axis line-chart-axis--y">
              {t}%
            </text>
          </g>
        ))}
        {AGE_BUCKETS.map((b, i) => (
          <text
            key={b.label}
            x={x(i)}
            y={H - padB + 14}
            className="line-chart-axis line-chart-axis--x"
          >
            {b.label}
          </text>
        ))}
        {series.map((s) => {
          const points = AGE_BUCKETS.map((b, i) => `${x(i)},${y(s.data[b.key])}`).join(" ");
          return (
            <g key={s.name} opacity={s.opacity}>
              <polyline
                points={points}
                stroke={s.color}
                strokeWidth={s.strokeWidth}
                fill="none"
                className="line-chart-line"
              />
              {AGE_BUCKETS.map((b, i) => (
                <circle
                  key={b.label}
                  cx={x(i)}
                  cy={y(s.data[b.key])}
                  r={s.dotRadius}
                  fill={s.color}
                >
                  <title>{`${s.name} — ${b.label} : ${s.data[b.key]}%`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <ul className="line-chart-legend">
        {series.map((s) => (
          <li key={s.name}>
            <span className="line-chart-legend-dot" style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
