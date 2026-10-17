import type { LocalTaxFinancesDto, LocalTaxPropertyTaxDto } from "@/types/location-analysis";
import { buildYearChart, localSeries, referenceSeries, type YearChartModel } from "./lineChart";
import { FRANCE_SERIES_COLOR, REFERENCE_SERIES_COLOR } from "./chartColors";

/** Évolution du taux global de taxe foncière, face aux médianes du département et de la France. */
export function buildLocalTaxChartModel(
  taxeFonciere: LocalTaxPropertyTaxDto,
  names: { local: string; department: string; france: string },
): YearChartModel {
  return buildYearChart(taxeFonciere.annees, [
    localSeries(names.local, taxeFonciere.tauxGlobal),
    // Le repère départemental est vide quand le département compte trop peu de communes.
    ...(taxeFonciere.medianeDepartement.some((v) => v !== null)
      ? [referenceSeries(names.department, REFERENCE_SERIES_COLOR, taxeFonciere.medianeDepartement)]
      : []),
    referenceSeries(names.france, FRANCE_SERIES_COLOR, taxeFonciere.medianeFrance),
  ]);
}

/** Évolution d'un poste des comptes de la commune, face aux communes de taille comparable. */
export function buildLocalFinanceChartModel(
  finances: LocalTaxFinancesDto,
  indicateur: LocalTaxFinancesDto["indicateurs"][number],
  names: { local: string; comparable: string },
): YearChartModel {
  return buildYearChart(finances.annees, [
    localSeries(names.local, indicateur.parHabitant),
    // Sans strate comparable (Paris), la courbe de la commune reste seule.
    ...(indicateur.moyenneStrate.some((v) => v !== null)
      ? [referenceSeries(names.comparable, REFERENCE_SERIES_COLOR, indicateur.moyenneStrate)]
      : []),
  ]);
}
