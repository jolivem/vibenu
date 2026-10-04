import type { ClimateMessages } from "../../fr/analysis/climate";
import { createFormat } from "../../../format";

const f = createFormat("en");

const climateTypes: Record<string, string> = {
  continental: "continental",
  méditerranéen: "Mediterranean",
  océanique: "oceanic",
};

const metrics: ClimateMessages["metrics"] = {
  temperatureC: { label: "Temperature", unit: "monthly mean, in °C" },
  precipitationMm: { label: "Rainfall", unit: "monthly total, in mm" },
  sunshineHours: { label: "Sunshine", unit: "monthly total, in hours" },
};

export const climate: ClimateMessages = {
  title: (from, to) => `Climate (${from}–${to} normals)`,
  localSeries: "This address",
  metrics,
  format: {
    temperatureC: (value) => `${f.fixed(value, 1)} °C`,
    precipitationMm: (value) => `${Math.round(value)} mm`,
    sunshineHours: (value) => `${Math.round(value)} h`,
  },
  axisTick: (value) => f.number(value),
  pointTitle: (series, x, value) => `${series} — ${x}: ${value}`,
  monthInitials: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  monthNames: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  chartAria: (label) => `${label} month by month — compared with three typical climates`,
  climateTypes,
  referencesNote: (references) => {
    const head = "Month-by-month profile, compared with cities typical of France's main climates";
    if (references.length === 0) return `${head}.`;
    const list = references
      .map(({ name, climateType }) => `${name} for the ${climateTypes[climateType] ?? climateType} climate`)
      .join(", ");
    return `${head}: ${list}.`;
  },
  stationLine: (metric, name, distanceKm) =>
    `${metrics[metric].label}: ${name} (${f.decimal(distanceKm, 1)} km)`,
  stationsNote: (lines) => `Nearest weather stations — ${lines.join(" · ")}.`,
  referenceStationsNote: (pairs) =>
    `Reference cities measured at ${pairs.map((p) => `${p.station} for ${p.city}`).join(", ")}.`,
  pdfMeasure: (label, value, france) => `${label} ${value} (France ${france})`,
  pdfFormat: {
    temperatureC: (value) => `${f.fixed(value, 1)} °C`,
    precipitationMm: (value) => `${f.int(value)} mm`,
    sunshineHours: (value) => `${f.int(value)} h`,
  },
};
