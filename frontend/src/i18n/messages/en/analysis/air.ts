import type { AirMessages } from "../../fr/analysis/air";
import type { AirQualityLevel } from "@/types/location-analysis";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const levels: Record<AirQualityLevel, string> = {
  bon: "Good",
  moyen: "Fair",
  dégradé: "Moderate",
  mauvais: "Poor",
  très_mauvais: "Very poor",
};

export const air: AirMessages = {
  title: "Air quality",
  levels,
  shortDay: (iso) => {
    const d = new Date(iso);
    return `${WEEKDAYS[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`;
  },
  pollutants: {
    no2: "nitrogen dioxide (NO₂)",
    o3: "ozone (O₃)",
    pm10: "PM10 particles",
    pm25: "PM2.5 fine particles",
    so2: "sulphur dioxide (SO₂)",
  },
  recentDays: (count) => `Over the last ${count} days`,
  averageLead: " — on average ",
  monthlyLead: (count) => `Over the last ${count} days — average quality `,
  dayTitle: (date, level) => `${date}: ${levels[level]}`,
  pollutantLevel: (level) => `— ${levels[level]}`,
  debugSummary: "Data received from Atmo (debug)",
  pdfLabel: "Air quality",
  pdfLine: (level, days) => `${levels[level].toLowerCase()} over the last ${days} days`,
};
