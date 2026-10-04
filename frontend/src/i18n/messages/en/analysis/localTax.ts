import type { FinanceComparison, LocalTaxMessages, MedianGap } from "../../fr/analysis/localTax";
import { createFormat } from "../../../format";
import { population } from "./population";

const f = createFormat("en");

const rate = (value: number) => `${f.decimal(value, 2)}%`;
const euros = (value: number) => `€${f.int(value)}`;

function versusMedian(gap: MedianGap, reference: string, median: number): string {
  return gap === "same"
    ? `in line with ${reference} (${rate(median)})`
    : `${population.points(gap.points)} ${gap.more ? "above" : "below"} ${reference} (${rate(median)})`;
}

const FRANCE_MEDIAN = "the median for French communes";
const COMPARABLE = "communes of comparable size";

function financeClause(c: FinanceComparison | null): string {
  if (!c) return "";
  if (c.kind === "same") return `, in line with ${COMPARABLE} (${euros(c.ref)})`;
  if (c.kind === "pct") return `, ${c.pct}% ${c.more ? "more" : "less"} than ${COMPARABLE} (${euros(c.ref)})`;
  return `, against ${euros(c.ref)} for ${COMPARABLE}`;
}

export const localTax: LocalTaxMessages = {
  title: "Local taxes",
  rate,
  euros,
  axisTick: (value) => f.number(value),
  pointTitle: (series, x, value) => `${series} — ${x}: ${value}`,
  localSeries: (wholeCity) => (wholeCity ? "The city" : "This commune"),
  propertyTax: {
    title: "Property tax on buildings (taxe foncière)",
    unit: "overall rate voted, as a % of the tax base, excluding the waste collection tax",
    sentence: (p) => [
      { strong: rate(p.rate) },
      ` in ${p.year}${p.france ? `, ${versusMedian(p.france.gap, FRANCE_MEDIAN, p.france.median)}` : ""}.${
        p.departmentMedian !== null
          ? ` Median for communes in the département: ${rate(p.departmentMedian)}.`
          : ""
      }`,
    ],
    chartAria: (from, to) => `Overall property tax rate on buildings, from ${from} to ${to}`,
    departmentSeries: "Département median",
    franceSeries: "France median",
    medianNote: "Median: one commune in two has a lower rate, one in two a higher rate.",
  },
  finances: {
    title: (wholeCity) => `Accounts of the ${wholeCity ? "city" : "commune"}`,
    unit: (comparable) =>
      `in euros per inhabitant${comparable ? `, against the average for ${COMPARABLE}` : ""}`,
    labels: {
      dette: "Debt",
      impots: "Local taxes",
      equipement: "Capital spending",
      caf: "Gross savings",
    },
    sentence: (p) => [{ strong: euros(p.value) }, ` in ${p.year}${financeClause(p.comparison)}.`],
    chartAria: (label, from, to) => `${label}, in euros per inhabitant, from ${from} to ${to}`,
    comparableSeries: "Comparable communes",
    noComparison: "No comparison average: this commune is alone in its size category.",
  },
  waste: {
    title: "Household waste",
    unit: "waste collection tax (TEOM), as a % of the same base",
    sentence: (p) => [
      { strong: rate(p.rate) },
      `${p.year !== null ? ` in ${p.year}` : ""}${
        p.france
          ? `, ${versusMedian(p.france.gap, "the median for French communes that levy this tax", p.france.median)}`
          : ""
      }.${
        p.departmentMedian !== null ? ` Département median: ${rate(p.departmentMedian)}.` : ""
      } It is added to the property tax, on the same tax notice.`,
    ],
    none: "No TEOM rate published: waste collection is funded another way, through a fee billed to users or from the general budget.",
  },
  secondHomes: {
    title: "Second homes and vacant dwellings",
    housingTax: (p) => [
      "Residence tax (taxe d'habitation) on second homes: ",
      { strong: rate(p.rate) },
      ` in ${p.year}${p.france ? `, ${versusMedian(p.france.gap, FRANCE_MEDIAN, p.france.median)}` : ""}.${
        p.departmentMedian !== null ? ` Département median: ${rate(p.departmentMedian)}.` : ""
      }`,
    ],
    surcharge: (p) => [
      "Surcharge on the residence tax for second homes",
      ...(p.rate !== null ? [": ", { strong: rate(p.rate) }] : []),
      ` in ${p.year}${
        p.france
          ? `, ${versusMedian(p.france.gap, `the median for the ${f.int(p.france.communes)} French communes that have voted one`, p.france.median)}`
          : ""
      }.`,
    ],
    noSurcharge: (year, communes) =>
      `No surcharge on second homes in ${year}${
        communes !== null ? `; ${f.int(communes)} communes in France have voted one` : ""
      }.`,
    vacancy: (p) => {
      const head = `This commune is ${p.within ? "within" : "outside"} the scope of the vacant dwellings tax in ${p.year}`;
      if (!p.france) return `${head}.`;
      const france = `${Math.round((p.france.nb / p.france.total) * 100)}% of French communes (${f.int(p.france.nb)})`;
      const department = p.department
        ? ` and ${p.department.nb === 0 ? "none" : p.department.nb} of the ${p.department.total} communes in the département`
        : "";
      return p.within ? `${head}, like ${france}${department}.` : `${head}; the tax covers ${france}${department}.`;
    },
  },
  transferDuty: {
    title: "Transfer duty on purchase",
    unit: "the département's share of the “notary fees”, as a % of the price",
    sentence: (p) => [
      { strong: rate(p.rate) },
      ` as of ${f.dateLong(p.validFrom)}${
        p.firstTimeBuyerRate !== null
          ? `, reduced to ${rate(p.firstTimeBuyerRate)} for the purchase of a first main residence`
          : ""
      }.`,
    ],
    scaleLink: "Official rate table (DGFiP, in French)",
  },
  wholeCityNote:
    "Rates and accounts for the whole city: they are voted by the city and are the same in all its arrondissements.",
  ratesNote: [
    "These figures are ",
    { strong: "rates" },
    ". The amount of a tax also depends on the cadastral rental value, which is specific to each home: it cannot be estimated here. Ask the seller for the latest property tax notice.",
  ],
  pdf: {
    heading: (wholeCity) => `Local taxes${wholeCity ? " — whole city" : ""}`,
    propertyTaxLabel: (year) => `Property tax ${year}`,
    propertyTax: (p) => {
      const references = [
        p.franceMedian !== null && `median for French communes ${rate(p.franceMedian)}`,
        p.departmentMedian !== null && `for the département ${rate(p.departmentMedian)}`,
      ].filter(Boolean);
      return `overall rate ${rate(p.rate)}${references.length ? ` (${references.join(", ")})` : ""}`;
    },
    wasteLabel: "Household waste",
    waste: (value) =>
      value !== null
        ? `waste collection tax ${rate(value)}, on top`
        : "no waste collection tax published (user fee or general budget)",
    secondHomesLabel: "Second homes",
    secondHomes: (p) =>
      [
        p.surcharge?.applied && `surcharge${p.surcharge.rate !== null ? ` of ${rate(p.surcharge.rate)}` : ""}`,
        p.surcharge && !p.surcharge.applied && "no surcharge",
        p.vacancyTax && "commune subject to the vacant dwellings tax",
      ]
        .filter(Boolean)
        .join(" · "),
    transferDutyLabel: "Transfer duty",
    transferDuty: (p) =>
      `département share ${rate(p.rate)}${
        p.firstTimeBuyerRate !== null ? ` (${rate(p.firstTimeBuyerRate)} for a first purchase)` : ""
      }, as of ${f.dateLong(p.validFrom)}`,
    debtLabel: (wholeCity, year) => `Debt of the ${wholeCity ? "city" : "commune"} ${year}`,
    debt: (value, comparable) =>
      `${euros(value)} per inhabitant${comparable !== null ? ` (${COMPARABLE}: ${euros(comparable)})` : ""}`,
  },
};
