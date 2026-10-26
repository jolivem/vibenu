import type { SecurityMessages } from "../../fr/analysis/security";
import { createFormat } from "../../../format";

const f = createFormat("en");

const rate = (value: number) => `${f.decimal(value, 2)}‰`;

export const security: SecurityMessages = {
  title: "Safety",
  rate,
  axisTick: (value) => f.number(value),
  pointTitle: (series, x, value) => `${series} — ${x}: ${value}`,
  base: {
    habitants: "per 1,000 inhabitants",
    logements: "per 1,000 dwellings",
  },
  unit: (base) => `recorded offences, ${base}`,
  insightUnit: (base) => `offences ${base}`,
  // Keys are the SSMSI labels, which serve as keys in the database.
  indicatorNames: {
    "Cambriolages de logement": "Home burglaries",
    "Vols dans les véhicules": "Thefts from vehicles",
    "Vols de véhicule": "Vehicle thefts",
    "Destructions et dégradations volontaires": "Criminal damage",
    "Violences physiques hors cadre familial": "Physical violence outside the family",
  },
  localSeries: {
    commune: "This commune",
    arrondissement: "This arrondissement",
  },
  departmentSeries: "Département",
  franceSeries: "France",
  sizeSeries: {
    1: "Communes under 2,000 pop.",
    2: "Communes of 2,000–10,000 pop.",
    3: "Towns of 10,000–50,000 pop.",
    4: "Cities of 50,000–200,000 pop.",
    5: "Cities over 200,000 pop.",
  },
  sizeGroup: {
    1: "communes with under 2,000 inhabitants",
    2: "communes with 2,000 to 10,000 inhabitants",
    3: "towns with 10,000 to 50,000 inhabitants",
    4: "cities with 50,000 to 200,000 inhabitants",
    5: "cities with over 200,000 inhabitants",
  },
  sizeNote: (group, arrondissement) =>
    `“Same size” benchmark: all ${group} in France${
      arrondissement ? ", the arrondissement being grouped with its city" : ""
    }, with Paris, Lyon and Marseille counted as whole cities. For communes whose figure is not published, the département average supplied by the SSMSI is used.`,
  chartAria: (name, unit, from, to) => `${name}, ${unit}, from ${from} to ${to}`,
  bandTitle: (year, low, high) =>
    `${year} — between 1 and 4 offences (${rate(low)} to ${rate(high)}), value withheld under statistical confidentiality`,
  bandLegend: "Range (value not published)",
  conversion: (p) => [
    `Green band: ${
      p.maskedYears === p.totalYears
        ? "every year"
        : `${p.maskedYears} year${p.maskedYears === 1 ? "" : "s"}`
    } in which the exact figure is not published. It means `,
    { strong: "1 to 4 offences" },
    ` in the year, which here corresponds to ${rate(p.low)} to ${rate(p.high)} — the chart is scaled in ‰, not in number of offences.`,
  ],
  latest: {
    title: (year) => `Offences recorded in ${year}`,
    masked: "1 to 4 offences",
    comparedTo: (group) => `Compared with the département and ${group ? `with ${group}` : "with France"}.`,
    references: (department, other, sameSize) =>
      [department && `dept. ${department}`, other && `${sameSize ? "same size" : "France"} ${other}`]
        .filter(Boolean)
        .join(" · "),
  },
  noPublication:
    "No year exceeds 4 offences for the indicators tracked: the exact values are not published, only their range is known.",
  scopeNote: (p) =>
    `Offences recorded by the police and gendarmerie from ${p.from} to ${p.to}, at the level of ${
      p.scale === "arrondissement" ? "the arrondissement" : `the commune${p.city ? ` of ${p.city}` : ""}`
    }. No public data exists at neighbourhood level.`,
  recordedNote: [
    "These are ",
    { strong: "recorded" },
    " offences: the measure also depends on how readily people report crime and on police presence. Counts of 1 to 4 are not published, so that the people involved cannot be identified; they appear here as a range.",
  ],
};
