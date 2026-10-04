import type { PdfMessages } from "../../fr/analysis/pdf";
import { createFormat } from "../../../format";

const f = createFormat("en");

function counted(count: number, zero: string, one: string, many: string): string {
  return count === 0 ? zero : `${count} ${count === 1 ? one : many}`;
}

export const pdf: PdfMessages = {
  documentTitle: (address) => `Summary sheet · ${address}`,
  subject: "Summary sheet for an address",
  eyebrow: "Summary sheet",
  filePrefix: "report",
  fileFallback: "analysis",
  date: (date) => date.toLocaleDateString(f.tag, { day: "2-digit", month: "long", year: "numeric" }),
  insightTag: "IN BRIEF",
  labelSeparator: ": ",
  notes: {
    origin: "The figures come directly from the public files.",
    sources:
      "Sources: IGN · DVF · DGFiP · Géorisques · INSEE · Interior Ministry · Météo-France · ATMO · Ministry of Education.",
    onlineLead: "Details, charts and maps: ",
  },
  property: {
    marketLabel: "Market",
    median: (pricePerSquareMeter) => `median price €${f.int(pricePerSquareMeter)}/m²`,
    transactions: (count) => `${count} nearby sale${count === 1 ? "" : "s"}`,
    noSale: "no recent sale on record",
    parcelLabel: "Plot",
    parcel: (surface, section, numero) => `${surface} · section ${section} no. ${numero}`,
    zoneLabel: "PLU zone:",
    prescriptionsLabel: "Restrictions",
  },
  nearby: {
    radius: (meters) => `Within ${meters} m`,
    restaurants: "Restaurants",
    closest: (name, proximity) => `${name} (${proximity})`,
    count: (count, closest) => {
      if (count === null) return closest;
      if (count === 0) return closest ? `none within the radius — nearest: ${closest}` : "none within the radius";
      return closest ? `${count} — nearest: ${closest}` : String(count);
    },
    arrondissementNote:
      "The facilities database assigns some amenities to the address of the body that runs them: at arrondissement level, the counts may be too high or too low.",
  },
  transport: {
    stops: (count) => counted(count, "no bus or tram stop", "bus or tram stop", "bus or tram stops"),
    stations: (count) => counted(count, "no railway or metro station", "railway or metro station", "railway or metro stations"),
    nearestBusLabel: "Nearest bus or tram stop",
    stop: (name, proximity) => `${name}${proximity !== null ? ` (${proximity})` : ""}`,
    none: "No stop found nearby.",
  },
  population: {
    scopeLabel: (commune) => (commune ? "Commune" : "IRIS neighbourhood"),
  },
  elections: {
    leadingLabel: "Leading",
    participationLabel: "Turnout",
    leadingList: (name, head, score) => `${name}${head ? ` (${head})` : ""} ${score}`,
    participation: (value) => `turnout ${value}`,
    candidate: (name, score) => `${name} ${score}`,
    participationVsFrance: (local, france) => `${local} (France ${france})`,
  },
};
