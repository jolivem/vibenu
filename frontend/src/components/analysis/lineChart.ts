import type { LineChartSeries } from "./LineChart";
import { LOCAL_SERIES_COLOR } from "./chartColors";

/**
 * Géométrie commune aux graphes en courbes de l'écran d'analyse — répartition par âge
 * et profil climatique mensuel.
 *
 * Source unique volontaire : les deux graphes se suivent dans la même page et doivent
 * avoir exactement la même hauteur et les mêmes marges, sinon l'œil lit deux échelles
 * là où il n'y en a qu'une. Le style (couleurs, taille des libellés d'axes) est
 * partagé de la même façon, par les classes CSS `.line-chart*`.
 *
 * `W` vaut pour l'échelle : le SVG est posé en `viewBox` avec `width: 100%`, donc tout
 * est mis à l'échelle par `largeur_conteneur / W`. Deux graphes de même `W` rendent
 * leurs libellés à la même taille apparente — c'est ce qui les aligne réellement, pas
 * la valeur en pixels de `font-size`.
 */
/**
 * Demi-largeur d'une bande d'incertitude, en fraction du demi-pas entre deux abscisses.
 *
 * Partagé entre le rendu (`LineChart`) et les modèles qui construisent l'échelle des
 * abscisses : un modèle qui pose des bandes doit réserver cette marge aux deux
 * extrémités, sinon la première déborde sur les graduations de l'ordonnée.
 */
export const BAND_HALF_WIDTH_RATIO = 0.6;

export const LINE_CHART_DIMENSIONS = {
  W: 400,
  H: 220,
  padL: 36,
  padR: 12,
  padT: 10,
  padB: 38,
} as const;

/**
 * Abscisses : l'année complète aux deux extrémités, deux chiffres entre les deux.
 *
 * « 2016 » répété dix fois se chevaucherait — d'où l'abrégé au départ. Mais une rangée
 * de « 16 17 18 … 25 » ne dit plus de quoi il s'agit : ce sont peut-être des âges, des
 * rangs, des numéros de département. Les deux bornes écrites en clair suffisent à
 * ancrer l'échelle, et le lecteur déduit le reste sans effort.
 *
 * La place existe aux extrémités et nulle part ailleurs : `BAND_HALF_WIDTH_RATIO`
 * réserve un retrait de part et d'autre du tracé, si bien que le premier et le dernier
 * point sont les seuls à n'avoir de voisin que d'un côté.
 *
 * Une seule année → elle est écrite en entier, l'abréger n'économiserait rien.
 */
export function yearLabels(annees: number[]): string[] {
  return annees.map((annee, i) =>
    i === 0 || i === annees.length - 1 ? String(annee) : String(annee).slice(2),
  );
}

/** Pas d'axe lisible : 1, 2, 5, 10… selon l'amplitude, pour 4 graduations. */
export function niceStep(max: number): number {
  const target = (max || 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalized = target / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

export interface YearChartModel {
  series: LineChartSeries[];
  yTicks: number[];
  x: (i: number) => number;
  y: (v: number) => number;
  xLabels: string[];
  xTitles: string[];
}

export function localSeries(name: string, values: (number | null)[]): LineChartSeries {
  return { name, color: LOCAL_SERIES_COLOR, strokeWidth: 2.8, dotRadius: 4, opacity: 1, values };
}

export function referenceSeries(name: string, color: string, values: (number | null)[]): LineChartSeries {
  return { name, color, strokeWidth: 1.4, dotRadius: 2.5, opacity: 0.75, values };
}

/**
 * Échelles d'un graphe annuel (fiscalité locale, qualité de l'air). Même géométrie que les graphes de délinquance — retrait aux
 * extrémités compris, pour que les années écrites en entier y tiennent.
 *
 * L'axe part de zéro, seule origine honnête pour comparer des ordres de grandeur, et ne
 * descend en dessous que si une valeur est négative (une épargne brute peut l'être).
 */
export function buildYearChart(
  annees: number[],
  series: LineChartSeries[],
  /** Valeurs à faire tenir dans l'axe sans les tracer en série (seuils). */
  include: number[] = [],
): YearChartModel {
  const values = [...series.flatMap((s) => s.values).filter((v): v is number => v !== null), ...include];
  const rawMax = Math.max(...values, 0);
  const rawMin = Math.min(...values, 0);
  const step = niceStep(rawMax - rawMin || 1);
  const maxY = Math.max(Math.ceil(rawMax / step) * step, step);
  const minY = Math.floor(rawMin / step) * step;

  const { W, H, padL, padR, padT, padB } = LINE_CHART_DIMENSIONS;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const intervals = Math.max(annees.length - 1, 1);
  const insetRatio = BAND_HALF_WIDTH_RATIO / 2;
  const xStep = plotW / (intervals + 2 * insetRatio);
  const inset = xStep * insetRatio;

  const yTicks: number[] = [];
  for (let t = minY; t <= maxY + step / 2; t += step) yTicks.push(Math.round(t * 100) / 100);

  return {
    series,
    yTicks,
    x: (i) => padL + inset + i * xStep,
    y: (v) => padT + plotH - ((v - minY) / (maxY - minY)) * plotH,
    xLabels: yearLabels(annees),
    xTitles: annees.map(String),
  };
}
