import { Fragment } from "react";
import type { LocalTaxAnalysisDto } from "@/types/location-analysis";
import { CardInsight } from "@/components/CardInsight";
import { ChartLegend } from "./ChartLegend";
import { LineChart } from "./LineChart";
import { buildLocalFinanceChartModel, buildLocalTaxChartModel } from "./localTaxChart";
import {
  FINANCE_LABELS,
  compareToMedian,
  describeTlvReach,
  formatDateLongue,
  formatEurosParHabitant,
  formatTaux,
  hasLocalTaxContent,
  summarizeFinance,
  summarizePropertyTax,
} from "./localTaxModel";

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
  insight,
}: {
  localTax: LocalTaxAnalysisDto;
  /** Mini-synthèse IA affichée sous le titre. Absente tant qu'elle n'est pas générée. */
  insight?: string | null;
}) {
  if (!hasLocalTaxContent(localTax)) return null;

  const { taxeFonciere, residencesSecondaires, dmto, finances, villeEntiere } = localTax;
  const localName = villeEntiere ? "La ville" : "Cette commune";
  const summary = taxeFonciere ? summarizePropertyTax(taxeFonciere) : null;
  const teomComparaison = taxeFonciere?.teom
    ? compareToMedian(
        taxeFonciere.teom.taux,
        taxeFonciere.teom.medianeFrance,
        "la médiane des communes de France qui prélèvent cette taxe",
      )
    : null;

  const { tauxTh = null, majoration = null, tlv = null } = residencesSecondaires ?? {};
  const thComparaison = tauxTh
    ? compareToMedian(tauxTh.taux, tauxTh.medianeFrance, "la médiane des communes de France")
    : null;
  const majorationComparaison =
    majoration?.appliquee && majoration.tauxPct !== null && majoration.nbCommunesFrance !== null
      ? compareToMedian(
          majoration.tauxPct,
          majoration.medianeFrance,
          `la médiane des ${majoration.nbCommunesFrance.toLocaleString("fr-FR")} communes de France qui en ont voté une`,
        )
      : null;

  const chart =
    taxeFonciere && taxeFonciere.annees.length >= 2
      ? buildLocalTaxChartModel(taxeFonciere, localName)
      : null;

  return (
    <section className="card local-tax-card">
      <h2>Fiscalité locale</h2>

      <CardInsight text={insight} />

      {taxeFonciere && summary && (
        <div className="insee-metric">
          <h3>Taxe foncière sur le bâti</h3>
          <p className="metric-unit">taux global voté, en % de la base d&apos;imposition, hors ordures ménagères</p>
          <p className="insee-prose">
            <strong>{formatTaux(summary.taux)}</strong> en {summary.annee}
            {summary.comparaisonFrance && `, ${summary.comparaisonFrance}`}.
            {summary.medianeDepartement !== null &&
              ` Médiane des communes du département : ${formatTaux(summary.medianeDepartement)}.`}
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
                formatValue={formatTaux}
                ariaLabel={`Taux global de taxe foncière sur le bâti, de ${taxeFonciere.annees[0]} à ${summary.annee}`}
              />
              <ChartLegend items={chart.series.map((s) => ({ name: s.name, color: s.color }))} />
            </>
          )}
          <p className="local-tax-detail">
            Médiane : une commune sur deux a un taux plus bas, une sur deux un taux plus élevé.
          </p>
        </div>
      )}

      {finances && (
        <div className="insee-metric">
          <h3>Comptes de la {villeEntiere ? "ville" : "commune"}</h3>
          <p className="metric-unit">
            en euros par habitant
            {finances.strateComparable && ", face à la moyenne des communes de taille comparable"}
          </p>
          {finances.indicateurs.map((indicateur) => {
            const poste = summarizeFinance(finances, indicateur);
            if (!poste) return null;
            const financeChart =
              finances.annees.length >= 2
                ? buildLocalFinanceChartModel(finances, indicateur, localName)
                : null;
            return (
              <Fragment key={indicateur.cle}>
                <p className="local-tax-finance-label">{FINANCE_LABELS[indicateur.cle]}</p>
                <p className="insee-prose">
                  <strong>{formatEurosParHabitant(poste.parHabitant)}</strong> en {poste.annee}
                  {poste.comparaison && `, ${poste.comparaison}`}.
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
                      formatValue={formatEurosParHabitant}
                      ariaLabel={`${FINANCE_LABELS[indicateur.cle]}, en euros par habitant, de ${finances.annees[0]} à ${poste.annee}`}
                    />
                    <ChartLegend items={financeChart.series.map((s) => ({ name: s.name, color: s.color }))} />
                  </>
                )}
              </Fragment>
            );
          })}
          {!finances.strateComparable && (
            <p className="local-tax-detail">
              Pas de moyenne de comparaison : cette commune est seule dans sa catégorie de taille.
            </p>
          )}
        </div>
      )}

      {taxeFonciere && (
        <div className="insee-metric">
          <h3>Ordures ménagères</h3>
          <p className="metric-unit">taxe d&apos;enlèvement (TEOM), en % de la même base</p>
          {taxeFonciere.teom ? (
            <p className="insee-prose">
              <strong>{formatTaux(taxeFonciere.teom.taux)}</strong>
              {summary && ` en ${summary.annee}`}
              {teomComparaison && `, ${teomComparaison}`}.
              {taxeFonciere.teom.medianeDepartement !== null &&
                ` Médiane du département : ${formatTaux(taxeFonciere.teom.medianeDepartement)}.`}{" "}
              Elle s&apos;ajoute à la taxe foncière, sur le même avis d&apos;imposition.
            </p>
          ) : (
            <p className="insee-prose">
              Pas de taux de TEOM publié : le service des déchets est financé autrement, par une
              redevance facturée à l&apos;usager ou par le budget général.
            </p>
          )}
        </div>
      )}

      {residencesSecondaires && (
        <div className="insee-metric">
          <h3>Résidences secondaires et logements vacants</h3>
          <ul className="local-tax-facts">
            {tauxTh && (
              <li>
                Taxe d&apos;habitation sur les résidences secondaires :{" "}
                <strong>{formatTaux(tauxTh.taux)}</strong> en {tauxTh.annee}
                {thComparaison && `, ${thComparaison}`}.
                {tauxTh.medianeDepartement !== null &&
                  ` Médiane du département : ${formatTaux(tauxTh.medianeDepartement)}.`}
              </li>
            )}
            {majoration && (
              <li>
                {majoration.appliquee ? (
                  <>
                    Majoration de la cotisation des résidences secondaires
                    {majoration.tauxPct !== null && (
                      <>
                        {" "}
                        : <strong>{formatTaux(majoration.tauxPct)}</strong>
                      </>
                    )}{" "}
                    en {majoration.annee}
                    {majorationComparaison && `, ${majorationComparaison}`}.
                  </>
                ) : (
                  <>
                    Pas de majoration sur les résidences secondaires en {majoration.annee}
                    {majoration.nbCommunesFrance !== null &&
                      ` ; ${majoration.nbCommunesFrance.toLocaleString("fr-FR")} communes en ont voté une en France`}
                    .
                  </>
                )}
              </li>
            )}
            {tlv && (
              <li>
                {tlv.soumise
                  ? "Commune dans le périmètre de la taxe sur les logements vacants"
                  : "Commune hors du périmètre de la taxe sur les logements vacants"}{" "}
                en {tlv.annee}
                {describeTlvReach(tlv)}.
              </li>
            )}
          </ul>
        </div>
      )}

      {dmto && (
        <div className="insee-metric">
          <h3>Droits de mutation à l&apos;achat</h3>
          <p className="metric-unit">part départementale des « frais de notaire », en % du prix</p>
          <p className="insee-prose">
            <strong>{formatTaux(dmto.tauxDepartemental)}</strong> au {formatDateLongue(dmto.valableAu)}
            {dmto.tauxPrimoAccedant !== null &&
              `, ramenés à ${formatTaux(dmto.tauxPrimoAccedant)} pour l’achat d’une première résidence principale`}
            .{" "}
            <a href={dmto.sourceUrl} target="_blank" rel="noopener noreferrer">
              Barème de la DGFiP
            </a>
            .
          </p>
        </div>
      )}

      {villeEntiere && (
        <p className="elections-footnote">
          Taux et comptes de la ville entière : ils sont votés par la ville et sont les mêmes
          dans tous ses arrondissements.
        </p>
      )}
      <p className="elections-footnote">
        Ces chiffres sont des <strong>taux</strong>. Le montant d&apos;une taxe dépend aussi de la
        valeur locative cadastrale, propre à chaque logement : il ne peut pas être estimé ici.
        Demandez le dernier avis de taxe foncière au vendeur.
      </p>
    </section>
  );
}
