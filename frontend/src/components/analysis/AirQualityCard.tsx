import type { AirQualityAnalysisDto, AnnualPollutantStatDto } from "@/types/location-analysis";
import type { AirMessages } from "@/i18n/messages/fr/analysis/air";
import { CardInsight } from "@/components/CardInsight";
import { ChartLegend } from "./ChartLegend";
import { LineChart } from "./LineChart";
import {
  THRESHOLD_COLOR,
  buildAirTrendChartModel,
  chartThresholds,
  type ChartThresholdKind,
} from "./airQualityModel";

export function AirQualityCard({
  airQuality,
  m,
  insight,
}: {
  airQuality: AirQualityAnalysisDto;
  m: AirMessages;
  /** Mini-synthèse IA affichée sous le titre. Absente tant qu'elle n'est pas générée. */
  insight?: string | null;
}) {
  return (
    <section className="card air-card">
      <h2>{m.title}</h2>

      <CardInsight text={insight} />

      {airQuality.annual.length > 0 && (
        <div className="air-annual">
          <p className="card-caveat">{m.annualCaveat}</p>
          <ul className="air-annual-list">
            {airQuality.annual.map((stat) => (
              <AnnualRow key={stat.code} stat={stat} m={m} />
            ))}
          </ul>
          <ThresholdNotes airQuality={airQuality} m={m} />
          {airQuality.annual.some((s) => s.ruralFallback) && (
            <p className="elections-footnote">{m.ruralFallbackNote}</p>
          )}
        </div>
      )}
    </section>
  );
}

/** Explique les seuils tracés sur les courbes de la card, et eux seuls, dans l'ordre de la légende. */
function ThresholdNotes({ airQuality, m }: { airQuality: AirQualityAnalysisDto; m: AirMessages }) {
  const order: ChartThresholdKind[] = ["who", "euLimit", "euTarget"];
  const shown = new Set(airQuality.annual.flatMap((s) => chartThresholds(s).map((t) => t.kind)));

  return (
    <dl className="air-threshold-notes">
      {order
        .filter((kind) => shown.has(kind))
        .map((kind) => (
          <div key={kind}>
            <dt style={{ borderTopColor: THRESHOLD_COLOR[kind] }}>
              {m.thresholdTerm(m.thresholdNames[kind])}
            </dt>{" "}
            <dd>{m.thresholdNotes[kind]}</dd>
          </div>
        ))}
    </dl>
  );
}

function AnnualRow({ stat, m }: { stat: AnnualPollutantStatDto; m: AirMessages }) {
  const chart = buildAirTrendChartModel(stat, { station: stat.stationName, national: m.trendSeries.national });
  const { years } = stat.history;
  const thresholds = chartThresholds(stat).map((t) => ({
    value: t.value,
    label: m.thresholdNames[t.kind],
    color: THRESHOLD_COLOR[t.kind],
  }));

  return (
    <li className="air-annual-row">
      <div className="air-annual-head">
        {/* Un vrai titre de bloc, comme « Ensoleillement » : il prend le style commun `.card h3`. */}
        <h3 className="air-annual-name">{m.annualPollutants[stat.code]}</h3>
        {/* La courbe porte déjà la dernière valeur ; sans courbe (moins de trois mesures),
            c'est le seul endroit où elle apparaît. */}
        {!chart && <strong className="air-annual-value">{m.value(stat.value, stat.unit)}</strong>}
      </div>
      {/* La station la plus proche peut différer d'un polluant à l'autre : chacun nomme la sienne. */}
      <p className="air-annual-station">
        {stat.ruralFallback ? m.ruralStationLead : m.stationLead}
        <span lang="fr">{stat.stationName}</span>
        {m.stationArea(stat.area)}
        {" · "}
        <strong className="air-annual-distance">{m.stationDistance(stat.distanceKm)}</strong>
        {" · "}
        {m.stationYear(stat.year)}
      </p>
      {chart && (
        <div className="air-annual-chart">
          <LineChart
            series={chart.series}
            xLabels={chart.xLabels}
            xTitles={chart.xTitles}
            yTicks={chart.yTicks}
            x={chart.x}
            y={chart.y}
            formatValue={(v) => m.value(v, stat.unit)}
            formatTick={m.axisTick}
            pointTitle={m.pointTitle}
            ariaLabel={m.chartAria(m.annualPollutants[stat.code], years[0], years[years.length - 1])}
            thresholds={thresholds}
          />
          <ChartLegend
            items={[
              ...chart.series.map((s) => ({ name: s.name, color: s.color })),
              ...thresholds.map((t) => ({ name: t.label, color: t.color, swatch: "dash" as const })),
            ]}
          />
        </div>
      )}
    </li>
  );
}
