import type {
  LocalFinanceKeyDto,
  LocalTaxAnalysisDto,
  LocalTaxFinancesDto,
  LocalTaxPropertyTaxDto,
  LocalTaxSecondHomesDto,
} from "@/types/location-analysis";
import { formatPoints } from "./indicator";

/**
 * Garde d'affichage de la card « Fiscalité locale », partagée par l'écran, la fiche PDF
 * et l'entrée de la mini-synthèse IA : une clé « En bref » n'est produite que si la card
 * s'affiche, et les trois doivent donc répondre d'une seule voix.
 */
export function hasLocalTaxContent(
  localTax: LocalTaxAnalysisDto | null | undefined,
): localTax is LocalTaxAnalysisDto {
  if (!localTax) return false;
  return Boolean(
    localTax.taxeFonciere || localTax.residencesSecondaires || localTax.dmto || localTax.finances,
  );
}

export function formatTaux(n: number): string {
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

export function formatEurosParHabitant(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} €`;
}

/** « 1er juin 2026 » à partir d'une date ISO. */
export function formatDateLongue(iso: string): string {
  const text = new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return text.replace(/^1 /, "1er ");
}

/** En dessous, un taux est dit « au niveau » de son repère : l'écart ne se lit pas. */
const ECART_NEGLIGEABLE_PTS = 0.05;

/**
 * La clause de comparaison d'un taux à son repère, écrite comme partout dans la page :
 * « soit 7,5 points de moins que la médiane des communes de France (40,33 %) ».
 */
export function compareToMedian(taux: number, mediane: number | null, repere: string): string | null {
  if (mediane === null) return null;
  const ecart = taux - mediane;
  return Math.abs(ecart) < ECART_NEGLIGEABLE_PTS
    ? `au niveau de ${repere} (${formatTaux(mediane)})`
    : `soit ${formatPoints(Math.abs(ecart))} ${ecart > 0 ? "de plus" : "de moins"} que ${repere} (${formatTaux(mediane)})`;
}

/** « 11 % » : part entière, sans décimale — un ordre de grandeur, pas une mesure. */
export function formatPart(nb: number, total: number): string {
  return `${Math.round((nb / total) * 100)} %`;
}

/**
 * Ce que couvre le périmètre de la taxe sur les logements vacants, à la suite de « Commune
 * dans / hors du périmètre… en 2026 » : part des communes de France, décompte du département.
 */
export function describeTlvReach(tlv: NonNullable<LocalTaxSecondHomesDto["tlv"]>): string {
  if (!tlv.france) return "";
  const france = `${formatPart(tlv.france.nb, tlv.france.total)} des communes de France (${tlv.france.nb.toLocaleString("fr-FR")})`;
  const departement = tlv.departement
    ? ` et ${tlv.departement.nb === 0 ? "aucune" : tlv.departement.nb} des ${tlv.departement.total} communes du département`
    : "";
  return tlv.soumise ? `, comme ${france}${departement}` : ` ; il couvre ${france}${departement}`;
}

export interface PropertyTaxSummary {
  annee: number;
  taux: number;
  /** « soit 7,5 points de moins que la médiane des communes de France (40,33 %) ». */
  comparaisonFrance: string | null;
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
    comparaisonFrance: compareToMedian(taux, taxeFonciere.medianeFrance[i], "la médiane des communes de France"),
    medianeDepartement: taxeFonciere.medianeDepartement[i],
  };
}

/** Libellés des comptes de la commune, dans l'ordre d'affichage. */
export const FINANCE_LABELS: Record<LocalFinanceKeyDto, string> = {
  dette: "Dette",
  impots: "Impôts locaux",
  equipement: "Dépenses d'équipement",
  caf: "Épargne brute",
};

export interface FinanceSummary {
  annee: number;
  parHabitant: number;
  moyenneStrate: number | null;
  /** « soit 37 % de moins que les communes de taille comparable (1 149 €) ». */
  comparaison: string | null;
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

  let comparaison: string | null = null;
  if (moyenneStrate !== null) {
    const repere = `les communes de taille comparable (${formatEurosParHabitant(moyenneStrate)})`;
    // Un pourcentage n'a de sens qu'entre deux montants positifs : une épargne négative
    // se compare en donnant les deux chiffres.
    if (moyenneStrate > 0 && parHabitant >= 0) {
      const pct = Math.round(((parHabitant - moyenneStrate) / moyenneStrate) * 100);
      comparaison =
        Math.abs(pct) < ECART_NEGLIGEABLE_PCT
          ? `au niveau de ${repere.replace(/^les /, "celui des ")}`
          : `soit ${Math.abs(pct)} % ${pct > 0 ? "de plus" : "de moins"} que ${repere}`;
    } else {
      comparaison = `contre ${formatEurosParHabitant(moyenneStrate)} pour les communes de taille comparable`;
    }
  }

  return { annee: finances.annees[i], parHabitant, moyenneStrate, comparaison };
}

/**
 * Les faits de la fiche PDF : une ligne par bloc, sans graphe. Mêmes chiffres et mêmes
 * gardes que la card — une TEOM absente n'y devient pas « 0 % ».
 */
export function localTaxFacts(localTax: LocalTaxAnalysisDto): Array<{ label: string; text: string }> {
  const facts: Array<{ label: string; text: string }> = [];
  const { taxeFonciere, residencesSecondaires, dmto, finances } = localTax;

  const summary = taxeFonciere ? summarizePropertyTax(taxeFonciere) : null;
  if (taxeFonciere && summary) {
    const reperes = [
      taxeFonciere.medianeFrance.at(-1) != null &&
        `médiane des communes de France ${formatTaux(taxeFonciere.medianeFrance.at(-1) as number)}`,
      summary.medianeDepartement !== null && `du département ${formatTaux(summary.medianeDepartement)}`,
    ].filter(Boolean);
    facts.push({
      label: `Taxe foncière ${summary.annee}`,
      text: `taux global ${formatTaux(summary.taux)}${reperes.length ? ` (${reperes.join(", ")})` : ""}`,
    });
    facts.push({
      label: "Ordures ménagères",
      text: taxeFonciere.teom
        ? `taxe d'enlèvement ${formatTaux(taxeFonciere.teom.taux)}, en plus`
        : "pas de taxe d'enlèvement publiée (redevance ou budget général)",
    });
  }

  const secondaires = [
    residencesSecondaires?.majoration?.appliquee &&
      `majoration${residencesSecondaires.majoration.tauxPct !== null ? ` de ${formatTaux(residencesSecondaires.majoration.tauxPct)}` : ""}`,
    residencesSecondaires?.majoration && !residencesSecondaires.majoration.appliquee && "pas de majoration",
    residencesSecondaires?.tlv?.soumise && "commune soumise à la taxe sur les logements vacants",
  ].filter(Boolean);
  if (secondaires.length) facts.push({ label: "Résidences secondaires", text: secondaires.join(" · ") });

  if (dmto) {
    facts.push({
      label: "Droits de mutation",
      text: `part départementale ${formatTaux(dmto.tauxDepartemental)}${dmto.tauxPrimoAccedant !== null ? ` (${formatTaux(dmto.tauxPrimoAccedant)} pour un premier achat)` : ""}, au ${formatDateLongue(dmto.valableAu)}`,
    });
  }

  const detteSerie = finances?.indicateurs.find((indicateur) => indicateur.cle === "dette");
  const dette = finances && detteSerie ? summarizeFinance(finances, detteSerie) : null;
  if (dette) {
    facts.push({
      label: `Dette de la ${localTax.villeEntiere ? "ville" : "commune"} ${dette.annee}`,
      text: `${formatEurosParHabitant(dette.parHabitant)} par habitant${dette.moyenneStrate !== null ? ` (communes de taille comparable : ${formatEurosParHabitant(dette.moyenneStrate)})` : ""}`,
    });
  }

  return facts;
}
