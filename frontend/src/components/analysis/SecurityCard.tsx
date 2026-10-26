import type { SecurityAnalysisDto, SecurityIndicatorDto } from "@/types/location-analysis";
import { CardInsight } from "@/components/CardInsight";
import { RichText } from "@/components/RichText";
import type { SecurityMessages, SecurityScale } from "@/i18n/messages/fr/analysis/security";
import { ChartLegend } from "./ChartLegend";
import { LineChart } from "./LineChart";
import { CardDetail } from "./readingMode";
import { FRANCE_SERIES_COLOR } from "./chartColors";
import {
  buildSecurityChartModel,
  isArrondissement,
  latestSecurityFacts,
  type SecurityChartReference,
} from "./securityChart";

/**
 * Le graphe d'un indicateur et ses repères.
 *
 * Exporté pour les pages commune SEO, qui comparent l'arrondissement à sa ville et à la
 * France plutôt qu'au département.
 */
export function SecurityIndicatorChart({
  indicator,
  annees,
  maille,
  references,
  m,
}: {
  indicator: SecurityIndicatorDto;
  annees: number[];
  maille: SecurityScale;
  /** Repères tracés à côté de la série locale. Par défaut : département et France. */
  references?: SecurityChartReference[];
  m: SecurityMessages;
}) {
  const model = buildSecurityChartModel(
    indicator,
    annees,
    m.localSeries[maille],
    references ?? [
      { name: m.departmentSeries, values: indicator.departement },
      { name: m.franceSeries, values: indicator.france, france: true },
    ],
  );
  const name = m.indicatorNames[indicator.indicateur] ?? indicator.indicateur;
  const base = m.base[indicator.base];

  // Le graphe est gradué en ‰ alors que le secret statistique s'exprime en faits : la
  // phrase de conversion ne s'affiche que s'il y a des bandes à expliquer.
  const bandes = model.bands;
  const conversion =
    bandes.length > 0
      ? {
          maskedYears: bandes.length,
          totalYears: annees.length,
          low: Math.min(...bandes.map((b) => b.low)),
          high: Math.max(...bandes.map((b) => b.high)),
        }
      : null;

  return (
    <div className="security-metric">
      <h3>{name}</h3>
      <p className="metric-unit">{m.unit(base)}</p>
      <LineChart
        series={model.series}
        bands={model.bands}
        xLabels={model.xLabels}
        xTitles={model.xTitles}
        yTicks={model.yTicks}
        x={model.x}
        y={model.y}
        formatValue={m.rate}
        formatTick={m.axisTick}
        pointTitle={m.pointTitle}
        ariaLabel={m.chartAria(name, base, annees[0], annees[annees.length - 1])}
        bandTitle={(i, low, high) => m.bandTitle(annees[i], low, high)}
      />
      <ChartLegend
        items={[
          ...model.series.map((s) => ({ name: s.name, color: s.color })),
          // La pastille de fourchette n'a de sens que sur un graphe qui en porte.
          ...(conversion ? [{ name: m.bandLegend, swatch: "band" as const }] : []),
        ]}
      />

      {conversion && (
        <p className="security-conversion">
          <RichText text={m.conversion(conversion)} />
        </p>
      )}
    </div>
  );
}

/**
 * Délinquance enregistrée par la police et la gendarmerie, sur 10 ans.
 *
 * Trois précautions structurent cette card, la donnée étant sensible et facile à mal lire :
 * la maille est annoncée (commune, pas quartier), la nature de la mesure est rappelée
 * (faits *enregistrés*, donc dépendants du dépôt de plainte et de la présence policière),
 * et les valeurs masquées sont montrées comme un encadrement plutôt que comme un vide.
 *
 * Pas de score, pas de classement, pas de vert ni de rouge — c'est la ligne du reste de
 * l'application : exposer les faits, laisser l'interprétation.
 *
 * En mode « L'essentiel », la dernière année de chaque indicateur ; les courbes et les
 * notes passent dans le détail.
 */
export function SecurityCard({
  security,
  codeInsee,
  ville,
  m,
  insight,
}: {
  security: SecurityAnalysisDto;
  codeInsee?: string;
  ville?: string;
  m: SecurityMessages;
  /** Mini-synthèse IA affichée sous le titre. Absente tant qu'elle n'est pas générée. */
  insight?: string | null;
}) {
  const { annees, indicateurs } = security;
  if (indicateurs.length === 0) return null;

  const maille: SecurityScale = isArrondissement(codeInsee) ? "arrondissement" : "commune";
  const aucunePublication = indicateurs.every((i) => i.commune.every((v) => v === null));
  const latest = latestSecurityFacts(indicateurs, annees);
  // Le repère « même taille » remplace la France : la délinquance enregistrée suit d'abord
  // la taille de la ville, et la moyenne France mêle métropoles et villages. Il en prend la
  // couleur. Sans tranche connue, la France reste.
  const tranche = security.tranche;
  const references = (indicator: SecurityIndicatorDto): SecurityChartReference[] => [
    { name: m.departmentSeries, values: indicator.departement },
    tranche !== null
      ? { name: m.sizeSeries[tranche], values: indicator.memeTaille, color: FRANCE_SERIES_COLOR }
      : { name: m.franceSeries, values: indicator.france, france: true },
  ];

  return (
    <section className="card security-card">
      <h2>{m.title}</h2>

      <CardInsight text={insight} />

      {aucunePublication && <p className="security-note">{m.noPublication}</p>}

      {latest && (
        <div className="security-latest">
          <h3>{m.latest.title(latest.year)}</h3>
          <p className="security-latest-scope">{m.latest.comparedTo(tranche !== null ? m.sizeGroup[tranche] : null)}</p>
          <dl>
            {latest.facts.map((fact) => (
              <div key={fact.indicateur}>
                <dt>
                  {m.indicatorNames[fact.indicateur] ?? fact.indicateur}
                  <span className="security-latest-base">{m.base[fact.base]}</span>
                </dt>
                <dd>
                  <strong>{fact.value !== null ? m.rate(fact.value) : m.latest.masked}</strong>
                  <span className="security-latest-ref">
                    {(() => {
                      const other = tranche !== null ? fact.memeTaille : fact.france;
                      return m.latest.references(
                        fact.departement !== null ? m.rate(fact.departement) : null,
                        other !== null ? m.rate(other) : null,
                        tranche !== null,
                      );
                    })()}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <CardDetail>
        {indicateurs.map((indicator) => (
          <SecurityIndicatorChart
            key={indicator.indicateur}
            indicator={indicator}
            annees={annees}
            maille={maille}
            references={references(indicator)}
            m={m}
          />
        ))}

        <p className="elections-footnote">
          {m.scopeNote({ from: annees[0], to: annees[annees.length - 1], scale: maille, city: ville })}
        </p>
        {tranche !== null && (
          <p className="elections-footnote">{m.sizeNote(m.sizeGroup[tranche], maille === "arrondissement")}</p>
        )}
        <p className="elections-footnote">
          <RichText text={m.recordedNote} />
        </p>
      </CardDetail>
    </section>
  );
}
