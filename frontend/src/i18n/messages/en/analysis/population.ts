import type { IndicatorComparison, PopulationMessages } from "../../fr/analysis/population";
import { createFormat } from "../../../format";

const f = createFormat("en");

/** "1 point", "2.4 points". */
function points(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${f.decimal(rounded, 1)} ${rounded === 1 ? "point" : "points"}`;
}

function comparisonClause(c: IndicatorComparison): string {
  switch (c.kind) {
    case "same":
      return ` the same as in France (${c.ref})`;
    case "gap":
      return ` ${c.gap} ${c.more ? "more" : "less"} than in France (${c.ref})`;
    case "ratio":
      return c.more
        ? ` ${f.decimal(c.times, 1)} times the French average (${c.ref})`
        : ` ${f.decimal(c.times, 1)} times below the French average (${c.ref})`;
    case "versus":
      return ` against ${c.ref} in France`;
  }
}

export const population: PopulationMessages = {
  format: {
    pct: (value) => `${f.decimal(value, 1, 1)}%`,
    percent: (value) => `${f.decimal(value, 1)}%`,
    density: (value) => `${f.number(value)} inhab./km²`,
    revenu: (value) => `€${f.int(value)}/year`,
    persons: (value) => `${f.decimal(value, 2, 2)} people`,
  },
  axisTick: (value) => f.number(value),
  pointTitle: (series, x, value) => `${series} — ${x}: ${value}`,
  scale: {
    neighbourhood: "Neighbourhood",
    commune: "Commune",
    france: "France",
  },
  points,
  sentence: (parts) => [
    { strong: parts.value },
    ` here${parts.comparison ? `,${comparisonClause(parts.comparison)}` : ""}${
      parts.commune ? `, and ${parts.commune.value} in ${parts.commune.name}` : ""
    }.`,
  ],
  compact: (title, local, france) => `${title} ${local}${france !== null ? ` (France ${france})` : ""}`,
  indicators: {
    densite: { title: "Density", unit: "inhabitants per km²" },
    revenu: { title: "Median income", unit: "median disposable income per consumption unit" },
    pauvrete: {
      title: "Poverty rate",
      unit: "share of the population below 60% of the median standard of living",
    },
    chomage: { title: "Unemployment rate", unit: "as a % of the labour force aged 15-64" },
    activite: { title: "Activity rate", unit: "as a % of people aged 15-64" },
    diplomes: {
      title: "Higher-education graduates",
      unit: "as a % of people aged 15 and over no longer in education",
    },
    taille: { title: "Average household size", unit: "people per household" },
    seules: { title: "People living alone", unit: "as a % of households" },
    monoparentales: { title: "Single-parent families", unit: "as a % of households" },
    vacants: { title: "Vacant homes", unit: "as a % of all dwellings" },
    secondaires: { title: "Second homes", unit: "as a % of all dwellings" },
  },
  segments: {
    alone: "Living alone",
    coupleNoChild: "Couple without children",
    coupleWithChildren: "Couple with children",
    singleParent: "Single-parent family",
    otherHouseholds: "Other households",
    owners: "Owner-occupiers",
    privateTenants: "Private tenants",
    socialTenants: "Social housing tenants (HLM)",
    freeOfCharge: "Housed free of charge",
    houses: "Houses",
    flats: "Flats",
  },
  barSummary: (row, segments) => `${row}: ${segments.join(", ")}`,
  segmentTitle: (label, value) => `${label} — ${value}`,
  demographics: {
    title: "Demographics",
    ageTitle: "Age distribution",
    ageUnit: "as a % of the population",
    ageAria: "Age distribution — multi-series comparison",
    agePoint: (series, bucket, value) => `${series} — ${bucket}: ${value}%`,
    footnote: (commune) =>
      `${
        commune
          ? "Population-weighted averages, aggregated from the commune's IRIS neighbourhoods."
          : "Commune and France: population-weighted averages, computed from the neighbourhoods."
      } Median income and the poverty rate are only published for neighbourhoods with enough inhabitants, mostly urban ones: they are often missing at neighbourhood level, and the France benchmark is therefore slightly higher than the national rate.`,
  },
  employment: {
    title: "Employment and qualifications",
    cspTitle: "Socio-professional categories",
    cspUnit: "as a % of people in work",
    cspLabels: ["Farm.", "Trade", "Manag.", "Interm.", "Clerical", "Manual"],
    cspTitles: [
      "Farmers",
      "Tradespeople, shopkeepers, business owners",
      "Managers and higher professional occupations",
      "Intermediate occupations",
      "Clerical and service workers",
      "Manual workers",
    ],
    cspNote:
      "People in work only: an unemployed person's category is that of their last job, which would repeat what the unemployment rate already says.",
    diplomaTitle: "Level of qualification",
    diplomaUnit: "as a % of people aged 15 and over no longer in education",
    diplomaLabels: ["None", "BEPC", "CAP-BEP", "Bac", "+2", "+3/4", "+5"],
    diplomaTitles: [
      "No qualification, or primary school certificate",
      "BEPC, lower secondary certificate",
      "CAP or BEP (vocational certificates)",
      "Baccalauréat (upper secondary)",
      "Baccalauréat + 2 years",
      "Baccalauréat + 3 or 4 years",
      "Baccalauréat + 5 years or more",
    ],
    footnote: [
      "The unemployment rate from the 2021 census is ",
      { strong: "self-reported" },
      ": it counts people who say they are unemployed, not those the International Labour Office counts as such. It is structurally one to two points above the rate published each quarter, and cannot be compared with it.",
    ],
  },
  households: {
    title: "Households and families",
    compositionTitle: "Household composition",
    compositionUnit: "as a % of households",
    childrenTitle: "Children per family",
    childrenUnit: "as a % of families, children under 25",
    childrenLabels: ["None", "1", "2", "3", "4+"],
    footnote:
      "Household composition, as counted in the 2021 census. A household is everyone living in the same dwelling, related or not.",
  },
  housing: {
    title: "Housing",
    occupancyTitle: "Tenure",
    occupancyUnit: "as a % of main residences",
    dwellingTitle: "Type of dwelling",
    dwellingUnit: "as a % of all dwellings",
    dwellingNote:
      "The two shares do not always add up to 100%: INSEE counts separately dwellings that are neither a house nor a flat.",
    roomsTitle: "Number of rooms",
    roomsUnit: "as a % of main residences",
    roomLabels: ["1 rm", "2 rm", "3 rm", "4 rm", "5+ rm"],
    epochTitle: "Period of construction",
    epochUnit: "as a % of main residences completed before 2019",
    epochLabels: ["<1919", "19-45", "46-70", "71-90", "91-05", "06-18"],
    epochTitles: ["Before 1919", "1919-1945", "1946-1970", "1971-1990", "1991-2005", "2006-2018"],
    epochNote:
      "INSEE only breaks down by period the dwellings completed before 2019: more recent ones appear in no band.",
    footnote:
      "The housing stock, as counted in the 2021 census. Census counts are weighted estimates, rounded to the unit: in a small neighbourhood, the shares may not add up to exactly 100%.",
  },
  scope: {
    kicker: "Neighbourhood:",
    text: (withMap) =>
      `Data for the IRIS neighbourhood, a statistical area of about 2,000 inhabitants${withMap ? ", outlined on the map." : "."}`,
    singleIris:
      "Single neighbourhood for this commune — the figures for the neighbourhood and the commune are identical.",
    mapAria: (name) => `Boundaries of the ${name} neighbourhood`,
  },
};
