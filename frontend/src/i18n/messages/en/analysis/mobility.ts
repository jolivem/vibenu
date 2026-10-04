import type { MobilityMessages, StationsKind } from "../../fr/analysis/mobility";

const headings: Record<StationsKind, [plural: string, nearest: string]> = {
  metroRer: ["Metro / RER", "Nearest metro / RER station"],
  metro: ["Metro", "Nearest metro station"],
  rer: ["RER", "Nearest RER station"],
  train: ["Railway station", "Nearest railway station"],
  station: ["Station", "Nearest station"],
  trainMetroRer: ["Railway, metro & RER", "Nearest railway, metro or RER station"],
  metroAndRer: ["Metro & RER", "Nearest metro or RER station"],
  stations: ["Stations", "Nearest station"],
};

export const mobility: MobilityMessages = {
  title: "Public transport",
  busTitle: "Bus",
  stationsTitle: (kind, nearestOnly) => headings[kind][nearestOnly ? 1 : 0],
};
