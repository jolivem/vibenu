import type { SecurityIndicatorDto } from "@/types/location-analysis";
import { BAND_HALF_WIDTH_RATIO, LINE_CHART_DIMENSIONS } from "./lineChart";
import type { LineChartBand, LineChartSeries } from "./LineChart";

/**
 * Couleur de la série communale — le même violet que la série principale des graphes
 * d'âge et de climat. « La courbe violette est celle qui vous concerne » vaut pour
 * toute la page.
 */
export const LOCAL_SERIES_COLOR = "#8b5cf6";

/** Repères, dans les teintes désaturées déjà employées par le graphe climatique. */
const DEPARTEMENT_COLOR = "#7c8ba1";
const FRANCE_COLOR = "#b08968";

export function formatRate(n: number): string {
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ‰`;
}

/** Étiquette de l'axe et des infobulles, selon le dénominateur de l'indicateur. */
export function baseLabel(base: SecurityIndicatorDto["base"]): string {
  return base === "logements" ? "pour 1 000 logements" : "pour 1 000 habitants";
}

export interface SecurityChartModel {
  series: LineChartSeries[];
  bands: LineChartBand[];
  yTicks: number[];
  x: (i: number) => number;
  y: (v: number) => number;
  xLabels: string[];
  xTitles: string[];
}

/**
 * Construit le graphe d'un indicateur : la courbe communale, ses deux repères, et les
 * bandes d'incertitude des années masquées par le secret statistique.
 *
 * Ne rend jamais `null` : un indicateur sans aucune valeur publiée garde son graphe,
 * entièrement en bande. « Jamais plus de 4 faits par an ici » est une information, et
 * la masquer donnerait à tort l'impression d'une commune non documentée.
 */
export function buildSecurityChartModel(
  indicator: SecurityIndicatorDto,
  annees: number[],
): SecurityChartModel {
  const series: LineChartSeries[] = [
    {
      name: "Cette commune",
      color: LOCAL_SERIES_COLOR,
      strokeWidth: 2.8,
      dotRadius: 4,
      opacity: 1,
      values: indicator.commune,
    },
    {
      name: "Département",
      color: DEPARTEMENT_COLOR,
      strokeWidth: 1.4,
      dotRadius: 2.5,
      opacity: 0.75,
      values: indicator.departement,
    },
    {
      name: "France",
      color: FRANCE_COLOR,
      strokeWidth: 1.4,
      dotRadius: 2.5,
      opacity: 0.75,
      values: indicator.france,
    },
  ];

  const bands: LineChartBand[] = [];
  for (const [i] of annees.entries()) {
    const low = indicator.borneBasse[i];
    const high = indicator.borneHaute[i];
    if (low !== null && high !== null) bands.push({ index: i, low, high });
  }

  const values = [
    ...series.flatMap((s) => s.values),
    ...bands.map((b) => b.high),
  ].filter((v): v is number => v !== null);

  const rawMax = Math.max(...values, 1);
  const step = niceStep(rawMax);
  const maxY = Math.ceil(rawMax / step) * step;

  const { W, H, padL, padR, padT, padB } = LINE_CHART_DIMENSIONS;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  /*
   * Les bandes sont centrées sur leur année et débordent de part et d'autre. On réserve
   * donc une demi-bande à chaque extrémité, plutôt que de coller la première année sur
   * l'axe : sans cette marge, sa bande recouvre les graduations de l'ordonnée, et la
   * rogner la rendrait plus étroite que les autres.
   *
   * Le pas se déduit de la marge, et la marge du pas — d'où la résolution en une fois :
   * pas × (intervalles + 2 × ratio_de_marge) = largeur disponible.
   */
  const intervals = Math.max(annees.length - 1, 1);
  const insetRatio = BAND_HALF_WIDTH_RATIO / 2;
  const xStep = plotW / (intervals + 2 * insetRatio);
  const inset = xStep * insetRatio;

  // Les taux sont toujours positifs : l'axe part de zéro, seule origine honnête pour
  // comparer des ordres de grandeur.
  const x = (i: number) => padL + inset + i * xStep;
  const y = (v: number) => padT + plotH - (v / (maxY || 1)) * plotH;

  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round(((maxY * i) / 4) * 100) / 100);

  return {
    series,
    bands,
    yTicks,
    x,
    y,
    // Deux chiffres en abscisse : « 2016 » dix fois de suite se chevaucherait.
    xLabels: annees.map((a) => String(a).slice(2)),
    xTitles: annees.map(String),
  };
}

/** Pas d'axe lisible : 1, 2, 5, 10… selon l'amplitude, pour 4 graduations. */
function niceStep(max: number): number {
  const target = (max || 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalized = target / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}
