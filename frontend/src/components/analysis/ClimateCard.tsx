import type { ClimateAnalysisDto } from "@/types/location-analysis";
import { CardInsight } from "@/components/CardInsight";
import type { ClimateMessages } from "@/i18n/messages/fr/analysis/climate";
import { ClimateChart } from "./ClimateChart";
import { CLIMATE_METRICS, climateEssentials } from "./climateChart";
import { CardDetail } from "./readingMode";
import { climateStationLines, climateTitle } from "./climateFormat";

type ClimateMonthly = NonNullable<ClimateAnalysisDto["monthly"]>;

/**
 * Climat de l'adresse, mois par mois, comparé à trois villes de climats types.
 *
 * Pas de comparaison à une moyenne France : un chiffre national moyen ne correspond
 * à aucun climat réel, alors que « plus proche de Strasbourg que de Marseille » se
 * comprend d'emblée.
 *
 * En mode « L'essentiel », les moyennes annuelles et les mois extrêmes ; les graphes et les
 * notes passent dans le détail.
 */
export function ClimateCard({
  climate,
  m,
  insight,
}: {
  climate: ClimateAnalysisDto;
  m: ClimateMessages;
  /** Mini-synthèse IA affichée sous le titre. Absente tant qu'elle n'est pas générée. */
  insight?: string | null;
}) {
  const monthly = climate.monthly;
  if (!monthly || !hasClimateSeries(monthly)) return null;

  // Le fournisseur nomme la série locale en français : le nom affiché vient des messages.
  const named = { ...monthly, local: { ...monthly.local, name: m.localSeries } };
  const stationLines = climateStationLines(climate, m);
  const essentials = climateEssentials(climate);
  const typedReferences = monthly.references.filter(
    (r): r is typeof r & { climateType: string } => Boolean(r.climateType),
  );
  const referenceStations = monthly.references.flatMap((r) =>
    r.stationName ? [{ station: r.stationName, city: r.name }] : [],
  );

  return (
    <section className="card climate-card">
      <h2>{climateTitle(climate, m)}</h2>

      <CardInsight text={insight} />

      {essentials && <ClimateEssentialFacts facts={essentials} m={m} />}

      <CardDetail>
        <ClimateCharts monthly={named} m={m} />

        <p className="elections-footnote">{m.referencesNote(typedReferences)}</p>
        {stationLines.length > 0 && <p className="elections-footnote">{m.stationsNote(stationLines)}</p>}
        {referenceStations.length > 0 && (
          <p className="elections-footnote">{m.referenceStationsNote(referenceStations)}</p>
        )}
      </CardDetail>
    </section>
  );
}

/** Les chiffres de l'essentiel, une ligne par mesure disponible. */
function ClimateEssentialFacts({ facts, m }: { facts: NonNullable<ReturnType<typeof climateEssentials>>; m: ClimateMessages }) {
  const temperature = m.essential.temperature(facts.meanTemperature, facts.coldest, facts.warmest);
  const lines = [
    temperature && { key: "temperature", label: m.essential.labels.temperature, text: temperature },
    facts.precipitation !== null && {
      key: "precipitation",
      label: m.essential.labels.precipitation,
      text: m.essential.precipitation(facts.precipitation),
    },
    facts.sunshine !== null && {
      key: "sunshine",
      label: m.essential.labels.sunshine,
      text: m.essential.sunshine(facts.sunshine),
    },
  ].filter((l): l is { key: string; label: string; text: string } => Boolean(l));
  return (
    <dl className="essential-facts">
      {lines.map((l) => (
        <div key={l.key}>
          <dt>{l.label}</dt>
          <dd>{l.text}</dd>
        </div>
      ))}
    </dl>
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
export function ClimateCharts({ monthly, m }: { monthly: ClimateMonthly; m: ClimateMessages }) {
  return (
    <>
      {CLIMATE_METRICS.map((metric) => (
        <ClimateChart
          key={metric.key}
          metric={metric.key}
          m={m}
          local={monthly.local}
          references={monthly.references}
        />
      ))}
    </>
  );
}
