import { Fragment } from "react";
import type { LocalTaxAnalysisDto } from "@/types/location-analysis";
import { CardInsight } from "@/components/CardInsight";
import { RichText } from "@/components/RichText";
import type { LocalTaxMessages } from "@/i18n/messages/fr/analysis/localTax";
import { ChartLegend } from "./ChartLegend";
import { LineChart } from "./LineChart";
import { buildLocalFinanceChartModel, buildLocalTaxChartModel } from "./localTaxChart";
import { hasLocalTaxContent, medianGap, summarizeFinance, summarizePropertyTax } from "./localTaxModel";

/**
 * Fiscalité locale : taxe foncière et ordures ménagères, résidences secondaires et
 * logements vacants, droits de mutation, comptes de la commune.
 *
 * Tout ici est un TAUX ou un montant par habitant. Le montant d'une taxe foncière dépend
 * de la valeur locative cadastrale du logement, qui n'est pas publique : la card le dit
 * et n'estime rien. Pas de score ni de couleur de jugement, comme ailleurs dans la page.
 *
 * Chaque bloc disparaît seul quand sa source ne connaît pas la commune.
 */
export function LocalTaxCard({
  localTax,
  m,
  insight,
}: {
  localTax: LocalTaxAnalysisDto;
  m: LocalTaxMessages;
  /** Mini-synthèse IA affichée sous le titre. Absente tant qu'elle n'est pas générée. */
  insight?: string | null;
}) {
  if (!hasLocalTaxContent(localTax)) return null;

  const { taxeFonciere, residencesSecondaires, dmto, finances, villeEntiere } = localTax;
  const localName = m.localSeries(villeEntiere);
  const summary = taxeFonciere ? summarizePropertyTax(taxeFonciere) : null;
  const { tauxTh = null, majoration = null, tlv = null } = residencesSecondaires ?? {};

  const chart =
    taxeFonciere && taxeFonciere.annees.length >= 2
      ? buildLocalTaxChartModel(taxeFonciere, {
          local: localName,
          department: m.propertyTax.departmentSeries,
          france: m.propertyTax.franceSeries,
        })
      : null;

  return (
    <section className="card local-tax-card">
      <h2>{m.title}</h2>

      <CardInsight text={insight} />

      {taxeFonciere && summary && (
        <div className="insee-metric">
          <h3>{m.propertyTax.title}</h3>
          <p className="metric-unit">{m.propertyTax.unit}</p>
          <p className="insee-prose">
            <RichText
              text={m.propertyTax.sentence({
                rate: summary.taux,
                year: summary.annee,
                france: summary.france,
                departmentMedian: summary.medianeDepartement,
              })}
            />
          </p>
          {chart && (
            <>
              <LineChart
                series={chart.series}
                xLabels={chart.xLabels}
                xTitles={chart.xTitles}
                yTicks={chart.yTicks}
                x={chart.x}
                y={chart.y}
                formatValue={m.rate}
                formatTick={m.axisTick}
                pointTitle={m.pointTitle}
                ariaLabel={m.propertyTax.chartAria(taxeFonciere.annees[0], summary.annee)}
              />
              <ChartLegend items={chart.series.map((s) => ({ name: s.name, color: s.color }))} />
            </>
          )}
          <p className="local-tax-detail">{m.propertyTax.medianNote}</p>
        </div>
      )}

      {finances && (
        <div className="insee-metric">
          <h3>{m.finances.title(villeEntiere)}</h3>
          <p className="metric-unit">{m.finances.unit(finances.strateComparable)}</p>
          {finances.indicateurs.map((indicateur) => {
            const poste = summarizeFinance(finances, indicateur);
            if (!poste) return null;
            const label = m.finances.labels[indicateur.cle];
            const financeChart =
              finances.annees.length >= 2
                ? buildLocalFinanceChartModel(finances, indicateur, {
                    local: localName,
                    comparable: m.finances.comparableSeries,
                  })
                : null;
            return (
              <Fragment key={indicateur.cle}>
                <p className="local-tax-finance-label">{label}</p>
                <p className="insee-prose">
                  <RichText
                    text={m.finances.sentence({
                      value: poste.parHabitant,
                      year: poste.annee,
                      comparison: poste.comparison,
                    })}
                  />
                </p>
                {financeChart && (
                  <>
                    <LineChart
                      series={financeChart.series}
                      xLabels={financeChart.xLabels}
                      xTitles={financeChart.xTitles}
                      yTicks={financeChart.yTicks}
                      x={financeChart.x}
                      y={financeChart.y}
                      formatValue={m.euros}
                      formatTick={m.axisTick}
                pointTitle={m.pointTitle}
                      ariaLabel={m.finances.chartAria(label, finances.annees[0], poste.annee)}
                    />
                    <ChartLegend items={financeChart.series.map((s) => ({ name: s.name, color: s.color }))} />
                  </>
                )}
              </Fragment>
            );
          })}
          {!finances.strateComparable && <p className="local-tax-detail">{m.finances.noComparison}</p>}
        </div>
      )}

      {taxeFonciere && (
        <div className="insee-metric">
          <h3>{m.waste.title}</h3>
          <p className="metric-unit">{m.waste.unit}</p>
          <p className="insee-prose">
            {taxeFonciere.teom ? (
              <RichText
                text={m.waste.sentence({
                  rate: taxeFonciere.teom.taux,
                  year: summary?.annee ?? null,
                  france: medianGap(taxeFonciere.teom.taux, taxeFonciere.teom.medianeFrance),
                  departmentMedian: taxeFonciere.teom.medianeDepartement,
                })}
              />
            ) : (
              m.waste.none
            )}
          </p>
        </div>
      )}

      {residencesSecondaires && (
        <div className="insee-metric">
          <h3>{m.secondHomes.title}</h3>
          <ul className="local-tax-facts">
            {tauxTh && (
              <li>
                <RichText
                  text={m.secondHomes.housingTax({
                    rate: tauxTh.taux,
                    year: tauxTh.annee,
                    france: medianGap(tauxTh.taux, tauxTh.medianeFrance),
                    departmentMedian: tauxTh.medianeDepartement,
                  })}
                />
              </li>
            )}
            {majoration && (
              <li>
                {majoration.appliquee ? (
                  <RichText text={m.secondHomes.surcharge(surchargeFacts(majoration))} />
                ) : (
                  m.secondHomes.noSurcharge(majoration.annee, majoration.nbCommunesFrance)
                )}
              </li>
            )}
            {tlv && (
              <li>
                {m.secondHomes.vacancy({
                  within: tlv.soumise,
                  year: tlv.annee,
                  france: tlv.france,
                  department: tlv.departement,
                })}
              </li>
            )}
          </ul>
        </div>
      )}

      {dmto && (
        <div className="insee-metric">
          <h3>{m.transferDuty.title}</h3>
          <p className="metric-unit">{m.transferDuty.unit}</p>
          <p className="insee-prose">
            <RichText
              text={m.transferDuty.sentence({
                rate: dmto.tauxDepartemental,
                validFrom: dmto.valableAu,
                firstTimeBuyerRate: dmto.tauxPrimoAccedant,
              })}
            />{" "}
            <a href={dmto.sourceUrl} target="_blank" rel="noopener noreferrer">
              {m.transferDuty.scaleLink}
            </a>
            .
          </p>
        </div>
      )}

      {villeEntiere && <p className="elections-footnote">{m.wholeCityNote}</p>}
      <p className="elections-footnote">
        <RichText text={m.ratesNote} />
      </p>
    </section>
  );
}

type Surcharge = NonNullable<NonNullable<LocalTaxAnalysisDto["residencesSecondaires"]>["majoration"]>;

/** La majoration votée et son repère : la médiane des communes qui en ont voté une. */
function surchargeFacts(majoration: Surcharge) {
  const reference =
    majoration.tauxPct !== null && majoration.nbCommunesFrance !== null
      ? medianGap(majoration.tauxPct, majoration.medianeFrance)
      : null;
  return {
    rate: majoration.tauxPct,
    year: majoration.annee,
    france:
      reference && majoration.nbCommunesFrance !== null
        ? { ...reference, communes: majoration.nbCommunesFrance }
        : null,
  };
}
