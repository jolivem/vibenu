import type { LocalFinanceKeyDto } from "@/types/location-analysis";
import { createFormat } from "../../../format";
import type { Rich } from "../../../types";
import { population } from "./population";

const f = createFormat("fr");

const rate = (value: number) => `${f.decimal(value, 2)} %`;
const euros = (value: number) => `${f.int(value)} €`;

/** Écart d'un taux à une médiane, en points ; `same` quand il ne se lit pas. */
export type MedianGap = "same" | { points: number; more: boolean };

/** Écart d'un montant aux communes de taille comparable. */
export type FinanceComparison =
  | { kind: "same"; ref: number }
  | { kind: "pct"; pct: number; more: boolean; ref: number }
  /** Montant négatif ou repère nul : on donne les deux chiffres, sans pourcentage. */
  | { kind: "versus"; ref: number };

/** « soit 7,5 points de moins que la médiane des communes de France (40,33 %) ». */
function versusMedian(gap: MedianGap, reference: string, median: number): string {
  return gap === "same"
    ? `au niveau de ${reference} (${rate(median)})`
    : `soit ${population.points(gap.points)} ${gap.more ? "de plus" : "de moins"} que ${reference} (${rate(median)})`;
}

const FRANCE_MEDIAN = "la médiane des communes de France";

/**
 * Card « Fiscalité locale ». Tout y est un taux ou un montant par habitant : aucune
 * phrase n'avance un montant d'impôt pour un logement.
 */
export const localTax = {
  title: "Fiscalité locale",
  rate,
  euros,
  /** Infobulle d'un point de courbe. */
  pointTitle: (series: string, x: string, value: string) => `${series} — ${x} : ${value}`,
  /** Graduation de l'axe des ordonnées. */
  axisTick: (value: number) => f.number(value),
  /** Nom de la série locale dans les graphes. */
  localSeries: (wholeCity: boolean): string => (wholeCity ? "La ville" : "Cette commune"),
  propertyTax: {
    title: "Taxe foncière sur le bâti",
    unit: "taux global voté, en % de la base d'imposition, hors ordures ménagères",
    sentence: (p: {
      rate: number;
      year: number;
      france: { gap: MedianGap; median: number } | null;
      departmentMedian: number | null;
    }): Rich => [
      { strong: rate(p.rate) },
      ` en ${p.year}${p.france ? `, ${versusMedian(p.france.gap, FRANCE_MEDIAN, p.france.median)}` : ""}.${
        p.departmentMedian !== null
          ? ` Médiane des communes du département : ${rate(p.departmentMedian)}.`
          : ""
      }`,
    ],
    chartAria: (from: number, to: number) =>
      `Taux global de taxe foncière sur le bâti, de ${from} à ${to}`,
    departmentSeries: "Médiane du département",
    franceSeries: "Médiane France",
    medianNote: "Médiane : une commune sur deux a un taux plus bas, une sur deux un taux plus élevé.",
  },
  finances: {
    title: (wholeCity: boolean) => `Comptes de la ${wholeCity ? "ville" : "commune"}`,
    unit: (comparable: boolean) =>
      `en euros par habitant${comparable ? ", face à la moyenne des communes de taille comparable" : ""}`,
    labels: {
      dette: "Dette",
      impots: "Impôts locaux",
      equipement: "Dépenses d'équipement",
      caf: "Épargne brute",
    } satisfies Record<LocalFinanceKeyDto, string> as Record<LocalFinanceKeyDto, string>,
    sentence: (p: { value: number; year: number; comparison: FinanceComparison | null }): Rich => {
      const c = p.comparison;
      const clause = !c
        ? ""
        : c.kind === "same"
          ? `, au niveau de celui des communes de taille comparable (${euros(c.ref)})`
          : c.kind === "pct"
            ? `, soit ${c.pct} % ${c.more ? "de plus" : "de moins"} que les communes de taille comparable (${euros(c.ref)})`
            : `, contre ${euros(c.ref)} pour les communes de taille comparable`;
      return [{ strong: euros(p.value) }, ` en ${p.year}${clause}.`];
    },
    chartAria: (label: string, from: number, to: number) =>
      `${label}, en euros par habitant, de ${from} à ${to}`,
    comparableSeries: "Communes comparables",
    noComparison:
      "Pas de moyenne de comparaison : cette commune est seule dans sa catégorie de taille.",
  },
  waste: {
    title: "Ordures ménagères",
    unit: "taxe d'enlèvement (TEOM), en % de la même base",
    sentence: (p: {
      rate: number;
      year: number | null;
      france: { gap: MedianGap; median: number } | null;
      departmentMedian: number | null;
    }): Rich => [
      { strong: rate(p.rate) },
      `${p.year !== null ? ` en ${p.year}` : ""}${
        p.france
          ? `, ${versusMedian(p.france.gap, "la médiane des communes de France qui prélèvent cette taxe", p.france.median)}`
          : ""
      }.${p.departmentMedian !== null ? ` Médiane du département : ${rate(p.departmentMedian)}.` : ""} Elle s'ajoute à la taxe foncière, sur le même avis d'imposition.`,
    ],
    /** Jamais « 0 % » : sans taux publié, le service est financé autrement. */
    none: "Pas de taux de TEOM publié : le service des déchets est financé autrement, par une redevance facturée à l'usager ou par le budget général.",
  },
  secondHomes: {
    title: "Résidences secondaires et logements vacants",
    housingTax: (p: {
      rate: number;
      year: number;
      france: { gap: MedianGap; median: number } | null;
      departmentMedian: number | null;
    }): Rich => [
      "Taxe d'habitation sur les résidences secondaires : ",
      { strong: rate(p.rate) },
      ` en ${p.year}${p.france ? `, ${versusMedian(p.france.gap, FRANCE_MEDIAN, p.france.median)}` : ""}.${
        p.departmentMedian !== null ? ` Médiane du département : ${rate(p.departmentMedian)}.` : ""
      }`,
    ],
    surcharge: (p: {
      rate: number | null;
      year: number;
      /** Repère : médiane des communes ayant voté une majoration, et leur nombre. */
      france: { gap: MedianGap; median: number; communes: number } | null;
    }): Rich => [
      "Majoration de la cotisation des résidences secondaires",
      ...(p.rate !== null ? [" : ", { strong: rate(p.rate) }] : []),
      ` en ${p.year}${
        p.france
          ? `, ${versusMedian(p.france.gap, `la médiane des ${f.int(p.france.communes)} communes de France qui en ont voté une`, p.france.median)}`
          : ""
      }.`,
    ],
    noSurcharge: (year: number, communes: number | null) =>
      `Pas de majoration sur les résidences secondaires en ${year}${
        communes !== null ? ` ; ${f.int(communes)} communes en ont voté une en France` : ""
      }.`,
    /** Périmètre de la taxe sur les logements vacants, et ce qu'il couvre. */
    vacancy: (p: {
      within: boolean;
      year: number;
      france: { nb: number; total: number } | null;
      department: { nb: number; total: number } | null;
    }) => {
      const head = `Commune ${p.within ? "dans le" : "hors du"} périmètre de la taxe sur les logements vacants en ${p.year}`;
      if (!p.france) return `${head}.`;
      // Part entière, sans décimale : un ordre de grandeur, pas une mesure.
      const france = `${Math.round((p.france.nb / p.france.total) * 100)} % des communes de France (${f.int(p.france.nb)})`;
      const department = p.department
        ? ` et ${p.department.nb === 0 ? "aucune" : p.department.nb} des ${p.department.total} communes du département`
        : "";
      return p.within ? `${head}, comme ${france}${department}.` : `${head} ; il couvre ${france}${department}.`;
    },
  },
  transferDuty: {
    title: "Droits de mutation à l'achat",
    unit: "part départementale des « frais de notaire », en % du prix",
    /** La phrase s'arrête avant le lien vers le barème, que la card pose à sa suite. */
    sentence: (p: { rate: number; validFrom: string; firstTimeBuyerRate: number | null }): Rich => [
      { strong: rate(p.rate) },
      ` au ${f.dateLong(p.validFrom)}${
        p.firstTimeBuyerRate !== null
          ? `, ramenés à ${rate(p.firstTimeBuyerRate)} pour l’achat d’une première résidence principale`
          : ""
      }.`,
    ],
    scaleLink: "Barème de la DGFiP",
  },
  wholeCityNote:
    "Taux et comptes de la ville entière : ils sont votés par la ville et sont les mêmes dans tous ses arrondissements.",
  ratesNote: [
    "Ces chiffres sont des ",
    { strong: "taux" },
    ". Le montant d'une taxe dépend aussi de la valeur locative cadastrale, propre à chaque logement : il ne peut pas être estimé ici. Demandez le dernier avis de taxe foncière au vendeur.",
  ] as Rich,
  /** Fiche PDF : une ligne par bloc, sans graphe. */
  pdf: {
    heading: (wholeCity: boolean) => `Fiscalité locale${wholeCity ? " — ville entière" : ""}`,
    propertyTaxLabel: (year: number) => `Taxe foncière ${year}`,
    propertyTax: (p: { rate: number; franceMedian: number | null; departmentMedian: number | null }) => {
      const references = [
        p.franceMedian !== null && `médiane des communes de France ${rate(p.franceMedian)}`,
        p.departmentMedian !== null && `du département ${rate(p.departmentMedian)}`,
      ].filter(Boolean);
      return `taux global ${rate(p.rate)}${references.length ? ` (${references.join(", ")})` : ""}`;
    },
    wasteLabel: "Ordures ménagères",
    waste: (value: number | null) =>
      value !== null
        ? `taxe d'enlèvement ${rate(value)}, en plus`
        : "pas de taxe d'enlèvement publiée (redevance ou budget général)",
    secondHomesLabel: "Résidences secondaires",
    secondHomes: (p: { surcharge: { applied: boolean; rate: number | null } | null; vacancyTax: boolean }) =>
      [
        p.surcharge?.applied && `majoration${p.surcharge.rate !== null ? ` de ${rate(p.surcharge.rate)}` : ""}`,
        p.surcharge && !p.surcharge.applied && "pas de majoration",
        p.vacancyTax && "commune soumise à la taxe sur les logements vacants",
      ]
        .filter(Boolean)
        .join(" · "),
    transferDutyLabel: "Droits de mutation",
    transferDuty: (p: { rate: number; firstTimeBuyerRate: number | null; validFrom: string }) =>
      `part départementale ${rate(p.rate)}${
        p.firstTimeBuyerRate !== null ? ` (${rate(p.firstTimeBuyerRate)} pour un premier achat)` : ""
      }, au ${f.dateLong(p.validFrom)}`,
    debtLabel: (wholeCity: boolean, year: number) => `Dette de la ${wholeCity ? "ville" : "commune"} ${year}`,
    debt: (value: number, comparable: number | null) =>
      `${euros(value)} par habitant${
        comparable !== null ? ` (communes de taille comparable : ${euros(comparable)})` : ""
      }`,
  },
};

export type LocalTaxMessages = typeof localTax;
