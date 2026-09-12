import type { ClimateMonthlySeriesDto } from "@/types/location-analysis";
import { ChartLegend } from "./ChartLegend";
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
      <h3>{label}</h3>
      <p className="metric-unit">{unit}</p>
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
      {/* Dérivée du modèle de CE graphe : une ville de référence dont la mesure manque
          n'y figure pas. La légende de card, unique, les annonçait toutes les trois pour
          les trois mesures — or l'ensoleillement n'est relevé que par une station sur
          trente. */}
      {/* Les noms seuls : la correspondance ville ↔ climat est donnée une fois en tête
          de card, ce qui évite de la répéter sous les trois graphes. */}
      <ChartLegend items={model.series.map((s) => ({ name: s.name, color: s.color }))} />
    </div>
  );
}
