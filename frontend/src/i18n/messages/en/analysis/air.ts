import type { AnnualPollutantCode } from "@/types/location-analysis";
import type { AirMessages } from "../../fr/analysis/air";
import { createFormat } from "../../../format";

const f = createFormat("en");

const areas: AirMessages["areas"] = {
  urban: "urban background",
  suburban: "suburban background",
  rural: "rural background",
};

const value: AirMessages["value"] = (v, unit) =>
  unit === "days" ? `${f.decimal(v, 1)} days/year` : `${f.decimal(v, 1)} µg/m³`;

const referenceLine: AirMessages["referenceLine"] = (kind, ratio) => {
  if (kind === "euTarget") {
    return ratio < 1
      ? "below the EU target value"
      : ratio === 1
        ? "at the EU target value"
        : "above the EU target value";
  }
  return ratio < 1
    ? "below the WHO guideline"
    : ratio === 1
      ? "at the WHO guideline"
      : `${f.decimal(ratio, 1)} × the WHO guideline`;
};

const shortPollutants: Record<AnnualPollutantCode, string> = {
  no2: "NO₂",
  pm25: "PM2.5",
  pm10: "PM10",
  o3: "O₃",
};

const thresholdNames: AirMessages["thresholdNames"] = {
  who: "WHO guideline",
  euLimit: "EU limit",
  euTarget: "EU target",
};

const signedPercent = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${f.int(Math.abs(n))}%`;

export const air: AirMessages = {
  title: "Air quality",
  annualCaveat: "Measured at the nearest station: indicative for the area, not for the exact address.",
  annualPollutants: {
    no2: "Nitrogen dioxide (NO₂)",
    pm25: "PM2.5 fine particles",
    pm10: "PM10 particles",
    o3: "Ozone (O₃) — peak days",
  },
  value,
  referenceLine,
  areas,
  stationLead: "Station ",
  ruralStationLead: "Rural reference station ",
  stationArea: (area) => ` (${areas[area]})`,
  stationDistance: (km) => `${f.decimal(km, 1)} km away`,
  stationYear: (year) => `${year} data`,
  trendSeries: { national: "France average" },
  thresholdNames,
  thresholdTerm: (name) => `${name}:`,
  thresholdNotes: {
    who: "maximum level recommended by the World Health Organization.",
    euLimit: "maximum level set by the 2024 European directive.",
    euTarget: "maximum European objective to be met where possible.",
  },
  axisTick: (v) => f.number(v),
  pointTitle: (series, x, v) => `${series} — ${x}: ${v}`,
  chartAria: (pollutant, from, to) => `${pollutant}: nearest station and France average, from ${from} to ${to}`,
  ruralFallbackNote:
    "No station within 20 km: the value comes from the nearest rural station, sited away from " +
    "any source to represent the surrounding countryside. It does not reflect a road or activity " +
    "close to the address.",
  insightPollutants: {
    no2: "nitrogen dioxide (NO₂)",
    pm25: "PM2.5 fine particles",
    pm10: "PM10 particles",
    o3: "ozone",
  },
  insightDaysUnit: "days of exceedance per year",
  insightRuralSource: (km) => `measured at a rural station ${km} km away, as there is none closer`,
  insightWhoGuideline: "WHO guideline",
  insightEuTarget: "EU target value",
  pdfLabel: "Air quality",
  pdfAnnual: (code, v, unit, kind, ratio, trend) =>
    `${shortPollutants[code]} ${value(v, unit)} (${referenceLine(kind, ratio)}` +
    (trend ? `, ${signedPercent(trend.change)} since ${trend.from})` : ")"),
};
