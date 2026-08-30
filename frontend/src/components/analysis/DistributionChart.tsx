import { ChartLegend } from "./ChartLegend";
import { LineChart } from "./LineChart";
import { buildDistributionModel, formatPercent, type InseeView } from "./inseeChart";

interface Props<T> {
  title: string;
  /** Ce que mesure l'ordonnée, sous le titre — « en % des résidences principales ». */
  unit: string;
  view: InseeView<T>;
  pick: (stats: T) => (number | null)[] | null;
  labels: readonly string[];
  /** Libellés complets pour les infobulles, quand l'abscisse est abrégée. */
  titles?: readonly string[];
  /** Précision de lecture propre à ce graphe (dénominateur inhabituel, par exemple). */
  note?: string;
}

/**
 * Un bloc « titre + unité + courbes + légende » de la rubrique Population.
 *
 * Ne rend rien quand l'échelle principale n'a pas la distribution : mieux vaut une
 * card plus courte qu'un graphe qui ne comparerait que des repères.
 */
export function DistributionChart<T>({ title, unit, view, pick, labels, titles, note }: Props<T>) {
  const model = buildDistributionModel({ ...view, pick });
  if (!model) return null;

  return (
    <div className="insee-metric">
      <h3>{title}</h3>
      <p className="insee-metric-unit">{unit}</p>
      <LineChart
        series={model.series}
        xLabels={labels}
        xTitles={titles}
        yTicks={model.yTicks}
        x={model.x}
        y={model.y}
        formatValue={formatPercent}
        ariaLabel={`${title} — ${unit}`}
      />
      <ChartLegend items={model.series.map((s) => ({ name: s.name, color: s.color }))} />
      {note && <p className="demographics-note">{note}</p>}
    </div>
  );
}
