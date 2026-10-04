import type {
  FinanceComparison,
  LocalTaxMessages,
  MedianGap,
} from "@/i18n/messages/fr/analysis/localTax";
import type {
  LocalTaxAnalysisDto,
  LocalTaxFinancesDto,
  LocalTaxPropertyTaxDto,
} from "@/types/location-analysis";

/**
 * Les faits de la card « Fiscalité locale », calculés une fois pour l'écran, la fiche PDF
 * et l'entrée de la mini-synthèse IA. Aucun texte ici : les phrases sont dans les messages
 * (`i18n/messages/<langue>/analysis/localTax.ts`).
 */

/**
 * Garde d'affichage de la card, partagée par l'écran, la fiche PDF et l'entrée de la
 * mini-synthèse IA : une clé « En bref » n'est produite que si la card s'affiche, et les
 * trois doivent donc répondre d'une seule voix.
 */
export function hasLocalTaxContent(
  localTax: LocalTaxAnalysisDto | null | undefined,
): localTax is LocalTaxAnalysisDto {
  if (!localTax) return false;
  return Boolean(
    localTax.taxeFonciere || localTax.residencesSecondaires || localTax.dmto || localTax.finances,
  );
}

/** En dessous, un taux est dit « au niveau » de son repère : l'écart ne se lit pas. */
const ECART_NEGLIGEABLE_PTS = 0.05;

/** Écart d'un taux à sa médiane de référence, ou `null` sans médiane. */
export function medianGap(
  taux: number,
  mediane: number | null,
): { gap: MedianGap; median: number } | null {
  if (mediane === null) return null;
  const ecart = taux - mediane;
  return {
    gap:
      Math.abs(ecart) < ECART_NEGLIGEABLE_PTS
        ? "same"
        : { points: Math.abs(ecart), more: ecart > 0 },
    median: mediane,
  };
}

export interface PropertyTaxSummary {
  annee: number;
  taux: number;
  france: { gap: MedianGap; median: number } | null;
  medianeDepartement: number | null;
}

/** Le dernier exercice de taxe foncière et sa position face à la médiane nationale. */
export function summarizePropertyTax(taxeFonciere: LocalTaxPropertyTaxDto): PropertyTaxSummary | null {
  const i = taxeFonciere.annees.length - 1;
  const taux = taxeFonciere.tauxGlobal[i];
  if (i < 0 || taux === null) return null;

  return {
    annee: taxeFonciere.annees[i],
    taux,
    france: medianGap(taux, taxeFonciere.medianeFrance[i]),
    medianeDepartement: taxeFonciere.medianeDepartement[i],
  };
}

export interface FinanceSummary {
  annee: number;
  parHabitant: number;
  moyenneStrate: number | null;
  comparison: FinanceComparison | null;
}

/** Sous ce seuil relatif, un poste est dit « au niveau » des communes comparables. */
const ECART_NEGLIGEABLE_PCT = 1;

/** Le dernier exercice connu d'un poste des comptes, et sa position face à la strate. */
export function summarizeFinance(
  finances: LocalTaxFinancesDto,
  indicateur: LocalTaxFinancesDto["indicateurs"][number],
): FinanceSummary | null {
  let i = indicateur.parHabitant.length - 1;
  while (i >= 0 && indicateur.parHabitant[i] === null) i--;
  if (i < 0) return null;

  const parHabitant = indicateur.parHabitant[i] as number;
  const moyenneStrate = indicateur.moyenneStrate[i];

  let comparison: FinanceComparison | null = null;
  if (moyenneStrate !== null) {
    // Un pourcentage n'a de sens qu'entre deux montants positifs : une épargne négative
    // se compare en donnant les deux chiffres.
    if (moyenneStrate > 0 && parHabitant >= 0) {
      const pct = Math.round(((parHabitant - moyenneStrate) / moyenneStrate) * 100);
      comparison =
        Math.abs(pct) < ECART_NEGLIGEABLE_PCT
          ? { kind: "same", ref: moyenneStrate }
          : { kind: "pct", pct: Math.abs(pct), more: pct > 0, ref: moyenneStrate };
    } else {
      comparison = { kind: "versus", ref: moyenneStrate };
    }
  }

  return { annee: finances.annees[i], parHabitant, moyenneStrate, comparison };
}

/**
 * Les faits de la fiche PDF : une ligne par bloc, sans graphe. Mêmes chiffres et mêmes
 * gardes que la card — une TEOM absente n'y devient pas « 0 % ».
 */
export function localTaxFacts(
  localTax: LocalTaxAnalysisDto,
  m: LocalTaxMessages,
): Array<{ label: string; text: string }> {
  const facts: Array<{ label: string; text: string }> = [];
  const { taxeFonciere, residencesSecondaires, dmto, finances } = localTax;

  const summary = taxeFonciere ? summarizePropertyTax(taxeFonciere) : null;
  if (taxeFonciere && summary) {
    facts.push({
      label: m.pdf.propertyTaxLabel(summary.annee),
      text: m.pdf.propertyTax({
        rate: summary.taux,
        franceMedian: summary.france?.median ?? null,
        departmentMedian: summary.medianeDepartement,
      }),
    });
    facts.push({ label: m.pdf.wasteLabel, text: m.pdf.waste(taxeFonciere.teom?.taux ?? null) });
  }

  const majoration = residencesSecondaires?.majoration ?? null;
  const secondHomes = m.pdf.secondHomes({
    surcharge: majoration ? { applied: majoration.appliquee, rate: majoration.tauxPct } : null,
    vacancyTax: Boolean(residencesSecondaires?.tlv?.soumise),
  });
  if (secondHomes) facts.push({ label: m.pdf.secondHomesLabel, text: secondHomes });

  if (dmto) {
    facts.push({
      label: m.pdf.transferDutyLabel,
      text: m.pdf.transferDuty({
        rate: dmto.tauxDepartemental,
        firstTimeBuyerRate: dmto.tauxPrimoAccedant,
        validFrom: dmto.valableAu,
      }),
    });
  }

  const detteSerie = finances?.indicateurs.find((indicateur) => indicateur.cle === "dette");
  const dette = finances && detteSerie ? summarizeFinance(finances, detteSerie) : null;
  if (dette) {
    facts.push({
      label: m.pdf.debtLabel(localTax.villeEntiere, dette.annee),
      text: m.pdf.debt(dette.parHabitant, dette.moyenneStrate),
    });
  }

  return facts;
}
