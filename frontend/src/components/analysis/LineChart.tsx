import { BAND_HALF_WIDTH_RATIO, LINE_CHART_DIMENSIONS } from "./lineChart";

export interface LineChartSeries {
  name: string;
  color: string;
  strokeWidth: number;
  dotRadius: number;
  opacity: number;
  /** Une valeur par graduation d'abscisse. `null` = pas de mesure à ce point. */
  values: (number | null)[];
}

/**
 * Zone d'incertitude sur une abscisse : la valeur exacte est inconnue mais encadrée.
 * Sert au secret statistique du SSMSI, qui masque les effectifs de 1 à 4.
 */
export interface LineChartBand {
  index: number;
  low: number;
  high: number;
}

interface Props {
  series: LineChartSeries[];
  /** Libellés d'abscisse — mois, années, tranches d'âge… */
  xLabels: readonly string[];
  yTicks: number[];
  x: (i: number) => number;
  y: (v: number) => number;
  /** Libellés longs pour les infobulles, quand `xLabels` est abrégé (« J » = janvier). */
  xTitles?: readonly string[];
  formatValue: (n: number) => string;
  ariaLabel: string;
  bands?: LineChartBand[];
  /** Décrit ce que représente une bande, dans l'infobulle. */
  bandTitle?: (index: number, low: number, high: number) => string;
}

/**
 * Graphe multi-séries en courbes, partagé par le profil climatique mensuel et
 * l'évolution de la délinquance.
 *
 * Ne connaît rien à ses données : il reçoit des séries, des libellés d'abscisse et les
 * échelles déjà construites par le modèle appelant. La géométrie et le style viennent de
 * `LINE_CHART_DIMENSIONS` et des classes `.line-chart*`, communes à tous les graphes de
 * la page — c'est ce qui garantit qu'ils rendent à la même échelle.
 *
 * `AgeChart` n'est pas encore passé par ici : il est antérieur et son modèle diffère.
 */
export function LineChart({
  series,
  xLabels,
  yTicks,
  x,
  y,
  xTitles,
  formatValue,
  ariaLabel,
  bands = [],
  bandTitle,
}: Props) {
  const { W, H, padL, padR, padB } = LINE_CHART_DIMENSIONS;
  const halfStep = xLabels.length > 1 ? (x(1) - x(0)) / 2 : 8;

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="line-chart-svg">
        {yTicks.map((t) => (
          <line
            key={t}
            x1={padL}
            x2={W - padR}
            y1={y(t)}
            y2={y(t)}
            className="line-chart-grid"
          />
        ))}

        {/*
          Après la grille et avant les courbes : une bande peut couvrir un trait de
          grille, jamais une valeur connue.

          Toutes les bandes ont la même largeur, y compris aux extrémités : c'est au
          modèle de réserver `BAND_HALF_WIDTH_RATIO` de marge de chaque côté de l'aire
          de tracé (voir `buildSecurityChartModel`). Rogner les bandes de bord serait
          visuellement faux — elles couvrent la même année que les autres.
        */}
        {bands.map((b) => (
          <rect
            key={b.index}
            x={x(b.index) - halfStep * BAND_HALF_WIDTH_RATIO}
            width={halfStep * BAND_HALF_WIDTH_RATIO * 2}
            y={y(b.high)}
            height={Math.max(y(b.low) - y(b.high), 1)}
            className="line-chart-band"
          >
            {bandTitle && <title>{bandTitle(b.index, b.low, b.high)}</title>}
          </rect>
        ))}

        {/* Après les bandes : les graduations restent lisibles quoi qu'il arrive. */}
        {yTicks.map((t) => (
          <text
            key={t}
            x={padL - 4}
            y={y(t)}
            className="line-chart-axis line-chart-axis--y"
          >
            {t.toLocaleString("fr-FR")}
          </text>
        ))}

        {xLabels.map((label, i) => (
          <text
            key={`${label}-${i}`}
            x={x(i)}
            y={H - padB + 14}
            className="line-chart-axis line-chart-axis--x"
          >
            {label}
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
                    <title>{`${s.name} — ${xTitles?.[i] ?? xLabels[i]} : ${formatValue(v)}`}</title>
                  </circle>
                ),
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
