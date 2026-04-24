import type { AgeDistributionDto } from "@/types/location-analysis";

export const AGE_BUCKETS: ReadonlyArray<{ label: string; key: keyof AgeDistributionDto }> = [
  { label: "0-14", key: "pct0_14" },
  { label: "15-29", key: "pct15_29" },
  { label: "30-44", key: "pct30_44" },
  { label: "45-59", key: "pct45_59" },
  { label: "60-74", key: "pct60_74" },
  { label: "75+", key: "pct75Plus" },
];

export const AGE_CHART_DIMENSIONS = {
  W: 400,
  H: 220,
  padL: 36,
  padR: 12,
  padT: 10,
  padB: 38,
} as const;

export interface AgeChartSeries {
  name: string;
  color: string;
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
}): AgeChartModel {
  const { iris, commune, france, showCommune } = params;

  const series: AgeChartSeries[] = [
    { name: "IRIS", color: "#78be20", data: iris },
  ];
  if (showCommune && commune) series.push({ name: "Commune", color: "#ea580c", data: commune });
  if (france) series.push({ name: "France", color: "#6b7280", data: france });

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
