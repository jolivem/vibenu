import type { ClimateAnalysisDto } from "@/types/location-analysis";
import { ClimateChart } from "./ClimateChart";
import { CLIMATE_METRICS, LOCAL_SERIES_COLOR, REFERENCE_COLORS } from "./climateChart";
import { CardInsight } from "@/components/CardInsight";

const FALLBACK_REFERENCE_COLOR = "#9ca3af";

function stationLine(
  label: string,
  station?: { name: string; distanceKm: number },
): string | null {
  if (!station) return null;
  const km = station.distanceKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  return `${label} : ${station.name} (${km} km)`;
}

/**
 * Climat de l'adresse, mois par mois, comparé à trois villes de climats types.
 *
 * Pas de comparaison à une moyenne France : un chiffre national moyen ne correspond
 * à aucun climat réel, alors que « plus proche de Strasbourg que de Marseille » se
 * comprend d'emblée.
 */
export function ClimateCard({
  climate,
  insight,
}: {
  climate: ClimateAnalysisDto;
  /** Mini-synthèse IA affichée sous le titre. Absente tant qu'elle n'est pas générée. */
  insight?: string | null;
}) {
  const monthly = climate.monthly;
  if (!monthly) return null;

  // Chaque graphe décide seul de s'afficher : `ClimateChart` rend null quand la série
  // locale est vide. Si aucune mesure n'est disponible, la card entière n'a rien à dire.
  const hasAnyMetric = CLIMATE_METRICS.some((m) =>
    monthly.local[m.key].some((v) => v !== null),
  );
  if (!hasAnyMetric) return null;

  const byMetric = climate.stationsByMetric;
  const stationLines = [
    stationLine("Température", byMetric?.temperature),
    stationLine("Précipitations", byMetric?.precipitation),
    stationLine("Ensoleillement", byMetric?.sunshine),
  ].filter((l): l is string => l !== null);

  return (
    <section className="card climate-card">
      <h2>Climat (normales {climate.periodStart}–{climate.periodEnd})</h2>
      <p className="muted">
        Profil mois par mois, comparé à trois villes représentatives des grands climats
        français.
      </p>

      <CardInsight text={insight} />

      <ul className="line-chart-legend climate-legend">
        <li>
          <span className="line-chart-legend-dot" style={{ background: LOCAL_SERIES_COLOR }} />
          {monthly.local.name}
        </li>
        {monthly.references.map((ref) => (
          <li key={ref.name}>
            <span
              className="line-chart-legend-dot"
              style={{ background: REFERENCE_COLORS[ref.name] ?? FALLBACK_REFERENCE_COLOR }}
            />
            {ref.name}
            {ref.climateType && <span className="climate-legend-type"> · {ref.climateType}</span>}
          </li>
        ))}
      </ul>

      {CLIMATE_METRICS.map((metric) => (
        <ClimateChart
          key={metric.key}
          metric={metric.key}
          label={metric.label}
          unit={metric.unit}
          format={metric.format}
          local={monthly.local}
          references={monthly.references}
        />
      ))}

      {stationLines.length > 0 && (
        <p className="elections-footnote">
          Stations Météo-France les plus proches — {stationLines.join(" · ")}.
        </p>
      )}
      <p className="elections-footnote">
        Source : Météo-France · Normales 1991-2020 par station (licence Etalab 2.0).
        {monthly.references.some((r) => r.stationName) && (
          <>
            {" "}Villes de référence mesurées à{" "}
            {monthly.references
              .filter((r) => r.stationName)
              .map((r) => `${r.stationName} pour ${r.name}`)
              .join(", ")}
            .
          </>
        )}
      </p>
    </section>
  );
}
