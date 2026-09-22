import type { ClimateAnalysisDto } from "@/types/location-analysis";

/** Le profil sur 12 mois d'un lieu et de ses repères — le champ `monthly` du DTO. */
type ClimateMonthly = NonNullable<ClimateAnalysisDto["monthly"]>;
import { ClimateChart } from "./ClimateChart";
import { CLIMATE_METRICS } from "./climateChart";
import { CardInsight } from "@/components/CardInsight";
import { climateStationLines, climateTitle } from "./climateFormat";

/** « le continental », mais « l'océanique » — élision devant voyelle. */
function withArticle(type: string): string {
  return /^[aeiouyàâäéèêëîïôöùûü]/i.test(type) ? `l'${type}` : `le ${type}`;
}

/**
 * « Strasbourg pour le climat continental, Marseille pour le méditerranéen, Brest
 * pour l'océanique. »
 *
 * Construite depuis les références effectivement reçues, et non écrite en dur : la table
 * `REFERENCE_CLIMATES` du serveur peut changer de villes, et une ville dont aucune mesure
 * n'est disponible n'arrive pas jusqu'ici.
 *
 * Cette phrase porte désormais la correspondance ville ↔ climat que les légendes
 * répétaient sous chacun des trois graphes. Dite une fois, en pied de card, elle allège trois
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
  if (!monthly || !hasClimateSeries(monthly)) return null;

  const stationLines = climateStationLines(climate);

  return (
    <section className="card climate-card">
      <h2>{climateTitle(climate)}</h2>

      <CardInsight text={insight} />

      <ClimateCharts monthly={monthly} />

      <p className="elections-footnote">
        Profil mois par mois, comparé à des villes représentatives des grands climats
        français
        {referenceSentence(monthly.references)
          ? ` : ${referenceSentence(monthly.references)}.`
          : "."}
      </p>
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

/** Le profil mensuel porte-t-il au moins une mesure ?
 *
 * Extrait du composant parce que deux appelants en dépendent : la card, qui se masque,
 * et les pages commune, dont le sommaire doit savoir si la rubrique a du contenu **avant**
 * de la monter — même discipline que `communeSectionContent`.
 */
export function hasClimateSeries(monthly: ClimateMonthly): boolean {
  // Chaque graphe décide seul de s'afficher : `ClimateChart` rend null quand la série
  // locale est vide. Si aucune mesure n'est disponible, la card entière n'a rien à dire.
  return CLIMATE_METRICS.some((m) => monthly.local[m.key].some((v) => v !== null));
}

/**
 * Les trois graphes de la card, sans son cadre ni ses notes : les pages commune les
 * reprennent tels quels, avec leurs propres sources.
 */
export function ClimateCharts({ monthly }: { monthly: ClimateMonthly }) {
  return (
    <>
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
    </>
  );
}
