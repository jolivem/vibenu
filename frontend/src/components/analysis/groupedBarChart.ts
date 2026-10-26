import { LINE_CHART_DIMENSIONS } from "./lineChart";

/**
 * Géométrie d'un graphe en bâtons groupés : une catégorie par groupe, un bâton par échelle
 * (quartier, commune, France).
 *
 * Pour les partitions sans ordre (composition des ménages) que la barre empilée rendait
 * mal : comparer des segments qui ne partent pas du même bord oblige à estimer des
 * longueurs flottantes, alors que des bâtons posés sur le même axe se comparent d'un coup
 * d'œil, catégorie par catégorie.
 *
 * Mêmes dimensions que les courbes de la page (`LINE_CHART_DIMENSIONS`), même échelle que
 * leurs répartitions (`buildScales` d'`inseeChart`) : un multiple de 10, au moins 10.
 */
export interface GroupedBarSeries {
  name: string;
  color: string;
  /** Une valeur par catégorie, en %. `null` = absente : pas de bâton. */
  values: (number | null)[];
}

export interface GroupedBarModel {
  yTicks: number[];
  y: (v: number) => number;
  /** Centre du groupe d'une catégorie. */
  groupCenter: (category: number) => number;
  /** Bord gauche du bâton d'une série dans une catégorie. */
  barX: (category: number, series: number) => number;
  barWidth: number;
}

/** Part d'un groupe occupée par ses bâtons ; le reste sépare les catégories. */
const GROUP_FILL = 0.72;
/** Écart entre deux bâtons d'un même groupe, en fraction de leur largeur. */
const BAR_GAP = 0.18;
/**
 * Largeur maximale d'un bâton, en unités du `viewBox` : avec deux catégories seulement
 * (maisons, appartements), ils s'étalaient en pavés.
 */
const BAR_MAX_WIDTH = 24;

export function buildGroupedBarModel(series: GroupedBarSeries[], categoryCount: number): GroupedBarModel {
  const { W, H, padL, padR, padT, padB } = LINE_CHART_DIMENSIONS;
  const maxValue = Math.max(0, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null)));
  const maxY = Math.max(10, Math.ceil(maxValue / 10) * 10);
  const step = maxY / 5;
  const yTicks = Array.from({ length: 6 }, (_, i) => Math.round(i * step));

  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const groupW = plotW / Math.max(categoryCount, 1);
  const n = Math.max(series.length, 1);
  const barWidth = Math.min((groupW * GROUP_FILL) / (n + (n - 1) * BAR_GAP), BAR_MAX_WIDTH);
  const barsW = n * barWidth + (n - 1) * barWidth * BAR_GAP;

  const groupCenter = (category: number) => padL + groupW * (category + 0.5);
  return {
    yTicks,
    y: (v: number) => padT + plotH - (v / maxY) * plotH,
    groupCenter,
    barX: (category: number, s: number) => groupCenter(category) - barsW / 2 + s * barWidth * (1 + BAR_GAP),
    barWidth,
  };
}

/**
 * Un libellé de catégorie sur deux lignes, coupé à l'espace le plus proche du milieu :
 * « Couple avec enfants » ne tient pas sous un groupe de 70 unités.
 */
export function splitLabel(label: string): string[] {
  const words = label.split(" ");
  if (words.length < 2) return [label];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}
