import type { ClimateMonthlySeriesDto } from "@/types/location-analysis";
import { LineChart } from "./LineChart";
import {
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
 * référence, en courbes.
 *
 * Rend `null` si la série locale est vide — voir `buildClimateChartModel`.
 */
export function ClimateChart({ metric, label, unit, format, local, references }: Props) {
  const model = buildClimateChartModel({ metric, local, references });
  if (!model) return null;

  return (
    <div className="climate-metric">
      <h3>
        {label} <span className="climate-metric-unit">({unit})</span>
      </h3>
      <LineChart
        series={model.series}
        xLabels={MONTH_LABELS}
        xTitles={MONTH_NAMES}
        yTicks={model.yTicks}
        x={model.x}
        y={model.y}
        formatValue={format}
        ariaLabel={`${label} mois par mois — comparaison avec trois climats types`}
      />
    </div>
  );
}
