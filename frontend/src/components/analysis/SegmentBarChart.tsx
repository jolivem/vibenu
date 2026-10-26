import type { PopulationMessages } from "@/i18n/messages/fr/analysis/population";
import { GroupedBarChart } from "./GroupedBarChart";
import { scaleBarSeries, type InseeView } from "./inseeChart";
import type { StackedBarSegment } from "./StackedBar";

/**
 * Une partition sans ordre (composition des ménages, statut d'occupation, type de
 * logement) en bâtons groupés : une catégorie par groupe, un bâton par échelle.
 *
 * Remplace la barre empilée, où des segments qui ne partent pas du même bord se
 * comparaient mal d'une échelle à l'autre. Les catégories sont celles de la fonction de
 * segments déjà utilisée par la barre (`populationIndicators.ts`).
 */
export function SegmentBarChart<T>({
  title,
  unit,
  view,
  segments,
  note,
}: {
  title: string;
  unit: string;
  view: InseeView<T>;
  segments: (stats: T, m: PopulationMessages) => StackedBarSegment[];
  note?: string;
}) {
  // Sans le lieu consulté, le graphe ne comparerait que des repères.
  if (!view.scoped.iris) return null;
  const series = scaleBarSeries(view, (stats) => segments(stats, view.m).map((s) => s.value));
  const categories = segments(view.scoped.iris, view.m).map((s) => s.label);
  return (
    <div className="insee-metric">
      <h3>{title}</h3>
      <p className="metric-unit">{unit}</p>
      <GroupedBarChart
        series={series}
        categories={categories}
        formatValue={view.m.format.percent}
        formatTick={view.m.axisTick}
        barTitle={view.m.pointTitle}
        ariaLabel={`${title} — ${unit}`}
      />
      {note && <p className="demographics-note">{note}</p>}
    </div>
  );
}
