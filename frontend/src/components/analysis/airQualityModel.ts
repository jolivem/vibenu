import type { AnnualPollutantCode, AnnualPollutantStatDto } from "@/types/location-analysis";
import { buildYearChart, localSeries, referenceSeries, type YearChartModel } from "./lineChart";
import { FRANCE_SERIES_COLOR } from "./chartColors";

/** Partagé par `AirQualityCard` et `PdfEnvironnementFiche`. */

/** Rapport au seuil de référence (OMS ou cible UE), arrondi au dixième (« 2,1 × »). */
export function referenceRatio(value: number, reference: number): number {
  return Math.round((value / reference) * 10) / 10;
}

/**
 * Valeurs limites annuelles de la directive européenne 2024/2881 (applicables en 2030), en
 * µg/m³ ; pour l'ozone, la valeur cible actuelle en jours. Tracées sur les courbes à côté de
 * la valeur guide OMS : l'OMS fixe l'objectif sanitaire, l'UE la limite légale.
 */
export const EU_LIMITS: Record<AnnualPollutantCode, number> = {
  no2: 20,
  pm25: 10,
  pm10: 20,
  o3: 25,
};

export type TrendDirection = "down" | "stable" | "up";

export interface AirTrend {
  /** Première année de la fenêtre de départ (« depuis 2016 »). */
  from: number;
  /** Écart relatif de la station, en % arrondi (−35 = baisse de 35 %). */
  change: number;
  /** Même calcul sur la moyenne France, aux mêmes années. */
  nationalChange: number;
  direction: TrendDirection;
  /** Moyennes des deux fenêtres comparées, dans l'unité du polluant — station puis France. */
  startMean: number;
  endMean: number;
  nationalStartMean: number;
  nationalEndMean: number;
}

/** Fenêtres comparées : une année isolée dépend trop de la météo (étés à ozone, hivers froids). */
const TREND_WINDOW = 3;
/** Au moins deux mesures dans chaque fenêtre pour que sa moyenne tienne. */
const TREND_MIN_PER_WINDOW = 2;
/** Écart minimal entre le début des deux fenêtres : en deçà, on ne parle pas de tendance. */
const TREND_MIN_SPAN_YEARS = 6;
/** Sous ±10 %, l'évolution reste dans la variabilité d'une année sur l'autre : « stable ». */
const TREND_STABLE_BAND = 10;

function windowMean(values: (number | null)[]): number | null {
  const known = values.filter((v): v is number => v !== null);
  return known.length >= TREND_MIN_PER_WINDOW ? known.reduce((s, v) => s + v, 0) / known.length : null;
}

/**
 * Tendance d'une station : moyenne de ses trois premières années mesurées face à celle des
 * trois dernières années de la série, et la même comparaison pour la France aux mêmes années.
 */
export function airTrend(history: AnnualPollutantStatDto["history"]): AirTrend | null {
  const first = history.station.findIndex((v) => v !== null);
  if (first < 0) return null;
  const last = history.years.length - TREND_WINDOW;
  if (history.years[last] - history.years[first] < TREND_MIN_SPAN_YEARS) return null;

  const slice = (values: (number | null)[], start: number) => values.slice(start, start + TREND_WINDOW);
  const startStation = windowMean(slice(history.station, first));
  const endStation = windowMean(slice(history.station, last));
  const startNational = windowMean(slice(history.national, first));
  const endNational = windowMean(slice(history.national, last));
  if (!startStation || endStation === null || !startNational || endNational === null) return null;

  const change = Math.round(((endStation - startStation) / startStation) * 100);
  const nationalChange = Math.round(((endNational - startNational) / startNational) * 100);
  const direction: TrendDirection =
    change <= -TREND_STABLE_BAND ? "down" : change >= TREND_STABLE_BAND ? "up" : "stable";
  return {
    from: history.years[first],
    change,
    nationalChange,
    direction,
    startMean: Math.round(startStation * 10) / 10,
    endMean: Math.round(endStation * 10) / 10,
    nationalStartMean: Math.round(startNational * 10) / 10,
    nationalEndMean: Math.round(endNational * 10) / 10,
  };
}

export type ChartThresholdKind = "who" | "euLimit" | "euTarget";

export const THRESHOLD_COLOR: Record<ChartThresholdKind, string> = {
  /** Le bleu du repère de la barre, qui porte le guide OMS ou, pour l'ozone, la cible UE. */
  who: "#2563eb",
  euTarget: "#2563eb",
  /** Orange : au-delà, la valeur dépasse la limite légale. */
  euLimit: "#f97316",
};

/**
 * Seuils à tracer sur la courbe d'un polluant : valeur guide OMS et valeur limite UE pour
 * NO₂ / PM2,5 / PM10 ; pour l'ozone, la seule valeur cible UE (l'OMS n'a pas de seuil en jours).
 */
export function chartThresholds(stat: AnnualPollutantStatDto): { kind: ChartThresholdKind; value: number }[] {
  if (stat.referenceKind === "euTarget") return [{ kind: "euTarget", value: stat.reference }];
  return [
    { kind: "who", value: stat.reference },
    { kind: "euLimit", value: EU_LIMITS[stat.code] },
  ];
}

/** Courbe de la station face à la moyenne France ; `null` sous trois mesures. */
export function buildAirTrendChartModel(
  stat: AnnualPollutantStatDto,
  names: { station: string; national: string },
): YearChartModel | null {
  const { years, station, national } = stat.history;
  if (station.filter((v) => v !== null).length < 3) return null;
  return buildYearChart(
    years,
    [localSeries(names.station, station), referenceSeries(names.national, FRANCE_SERIES_COLOR, national)],
    chartThresholds(stat).map((t) => t.value),
  );
}
