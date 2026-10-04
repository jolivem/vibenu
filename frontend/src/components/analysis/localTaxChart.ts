import type { LocalTaxFinancesDto, LocalTaxPropertyTaxDto } from "@/types/location-analysis";
import { BAND_HALF_WIDTH_RATIO, LINE_CHART_DIMENSIONS, niceStep, yearLabels } from "./lineChart";
import type { LineChartSeries } from "./LineChart";
import { FRANCE_SERIES_COLOR, LOCAL_SERIES_COLOR, REFERENCE_SERIES_COLOR } from "./chartColors";

export interface LocalTaxChartModel {
  series: LineChartSeries[];
  yTicks: number[];
  x: (i: number) => number;
  y: (v: number) => number;
  xLabels: string[];
  xTitles: string[];
}

function localSeries(name: string, values: (number | null)[]): LineChartSeries {
  return { name, color: LOCAL_SERIES_COLOR, strokeWidth: 2.8, dotRadius: 4, opacity: 1, values };
}

function referenceSeries(name: string, color: string, values: (number | null)[]): LineChartSeries {
  return { name, color, strokeWidth: 1.4, dotRadius: 2.5, opacity: 0.75, values };
}

/**
 * Échelles d'un graphe annuel. Même géométrie que les graphes de délinquance — retrait aux
 * extrémités compris, pour que les années écrites en entier y tiennent.
 *
 * L'axe part de zéro, seule origine honnête pour comparer des ordres de grandeur, et ne
 * descend en dessous que si une valeur est négative (une épargne brute peut l'être).
 */
function buildYearChart(annees: number[], series: LineChartSeries[]): LocalTaxChartModel {
  const values = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
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

/** Évolution du taux global de taxe foncière, face aux médianes du département et de la France. */
export function buildLocalTaxChartModel(
  taxeFonciere: LocalTaxPropertyTaxDto,
  names: { local: string; department: string; france: string },
): LocalTaxChartModel {
  return buildYearChart(taxeFonciere.annees, [
    localSeries(names.local, taxeFonciere.tauxGlobal),
    // Le repère départemental est vide quand le département compte trop peu de communes.
    ...(taxeFonciere.medianeDepartement.some((v) => v !== null)
      ? [referenceSeries(names.department, REFERENCE_SERIES_COLOR, taxeFonciere.medianeDepartement)]
      : []),
    referenceSeries(names.france, FRANCE_SERIES_COLOR, taxeFonciere.medianeFrance),
  ]);
}

/** Évolution d'un poste des comptes de la commune, face aux communes de taille comparable. */
export function buildLocalFinanceChartModel(
  finances: LocalTaxFinancesDto,
  indicateur: LocalTaxFinancesDto["indicateurs"][number],
  names: { local: string; comparable: string },
): LocalTaxChartModel {
  return buildYearChart(finances.annees, [
    localSeries(names.local, indicateur.parHabitant),
    // Sans strate comparable (Paris), la courbe de la commune reste seule.
    ...(indicateur.moyenneStrate.some((v) => v !== null)
      ? [referenceSeries(names.comparable, REFERENCE_SERIES_COLOR, indicateur.moyenneStrate)]
      : []),
  ]);
}
