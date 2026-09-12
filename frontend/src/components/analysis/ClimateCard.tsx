import type { ClimateAnalysisDto } from "@/types/location-analysis";
import { ClimateChart } from "./ClimateChart";
import { CLIMATE_METRICS } from "./climateChart";
import { CardInsight } from "@/components/CardInsight";

/** « le continental », mais « l'océanique » — élision devant voyelle. */
function withArticle(type: string): string {
  return /^[aeiouyàâäéèêëîïôöùûü]/i.test(type) ? `l'${type}` : `le ${type}`;
}

/**
 * « Strasbourg pour le climat continental, Marseille pour le méditerranéen, La Rochelle
 * pour l'océanique. »
 *
 * Construite depuis les références effectivement reçues, et non écrite en dur : la table
 * `REFERENCE_CLIMATES` du serveur peut changer de villes, et une ville dont aucune mesure
 * n'est disponible n'arrive pas jusqu'ici.
 *
 * Cette phrase porte désormais la correspondance ville ↔ climat que les légendes
 * répétaient sous chacun des trois graphes. Dite une fois, en tête, elle allège trois
 * légendes — et elle a la place d'être explicite là où la légende devait abréger.
 */
function referenceSentence(
  references: ReadonlyArray<{ name: string; climateType?: string }>,
): string | null {
  const typed = references.filter(
    (r): r is { name: string; climateType: string } => Boolean(r.climateType),
  );
  if (typed.length === 0) return null;
  return typed
    .map(({ name, climateType }, i) =>
      i === 0 ? `${name} pour le climat ${climateType}` : `${name} pour ${withArticle(climateType)}`,
    )
    .join(", ");
}

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
        Profil mois par mois, comparé à des villes représentatives des grands climats
        français
        {referenceSentence(monthly.references)
          ? ` : ${referenceSentence(monthly.references)}.`
          : "."}
      </p>

      <CardInsight text={insight} />

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
