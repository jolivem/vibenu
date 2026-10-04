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
