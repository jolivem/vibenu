import type { AgeDistributionDto } from "@/types/location-analysis";
import { LINE_CHART_DIMENSIONS } from "./lineChart";
import { LOCAL_SERIES_COLOR } from "./chartColors";

export const AGE_BUCKETS: ReadonlyArray<{ label: string; key: keyof AgeDistributionDto }> = [
  { label: "0-14", key: "pct0_14" },
  { label: "15-29", key: "pct15_29" },
  { label: "30-44", key: "pct30_44" },
  { label: "45-59", key: "pct45_59" },
  { label: "60-74", key: "pct60_74" },
  { label: "75+", key: "pct75Plus" },
];

/** Géométrie partagée avec le graphe climatique — voir lineChart.ts. */
export const AGE_CHART_DIMENSIONS = LINE_CHART_DIMENSIONS;

export interface AgeChartSeries {
  name: string;
  color: string;
  /** Épaisseur du trait (1.5 par défaut, 2.8 pour la série principale). */
  strokeWidth: number;
  /** Rayon des points (3 par défaut, 4.5 pour la série principale). */
  dotRadius: number;
  /** Opacité du trait (1 par défaut, 0.6 pour les séries de comparaison). */
  opacity: number;
  data: AgeDistributionDto;
}

export interface AgeChartModel {
  series: AgeChartSeries[];
  maxY: number;
  yTicks: number[];
  x: (i: number) => number;
  y: (v: number) => number;
}

export function buildAgeChartModel(params: {
  iris: AgeDistributionDto;
  commune: AgeDistributionDto | null;
  france: AgeDistributionDto | null;
  showCommune: boolean;
  mainSeriesName?: string;
}): AgeChartModel {
  const { iris, commune, france, showCommune, mainSeriesName = "Quartier" } = params;

  const series: AgeChartSeries[] = [
    // Série principale : vert plein, trait épais, points larges
    { name: mainSeriesName, color: LOCAL_SERIES_COLOR, strokeWidth: 2.8, dotRadius: 4.5, opacity: 1, data: iris },
  ];
  if (showCommune && commune) {
    series.push({ name: "Commune", color: "#a78060", strokeWidth: 1.4, dotRadius: 2.5, opacity: 0.65, data: commune });
  }
  if (france) {
    series.push({ name: "France", color: "#6b7280", strokeWidth: 1.4, dotRadius: 2.5, opacity: 0.65, data: france });
  }

  const allValues = series.flatMap((s) => AGE_BUCKETS.map((b) => s.data[b.key]));
  const rawMax = Math.max(...allValues, 10);
  const maxY = Math.ceil(rawMax / 5) * 5;

  const { W, H, padL, padR, padT, padB } = AGE_CHART_DIMENSIONS;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const x = (i: number) => padL + (i * plotW) / (AGE_BUCKETS.length - 1);
  const y = (v: number) => padT + plotH - (v / maxY) * plotH;

  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => (maxY * i) / tickCount);

  return { series, maxY, yTicks, x, y };
}
