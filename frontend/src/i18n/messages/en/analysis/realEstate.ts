import type { RealEstateMessages } from "../../fr/analysis/realEstate";
import { createFormat } from "../../../format";

const f = createFormat("en");

const s = (n: number) => (n === 1 ? "" : "s");

export const realEstate: RealEstateMessages = {
  title: "Property",
  kinds: { appartement: "Flats", maison: "Houses" },
  median: (kind, pricePerSquareMeter, count) => `${kind}: €${f.int(pricePerSquareMeter)}/m² (${f.int(count)} sale${s(count)})`,
  example: (surface, price) => `That is about €${f.int(price)} for ${surface} m².`,
  tooFew: (kind, count) => `${kind}: ${f.int(count)} sale${s(count)}, too few for a median price.`,
  nearby: (count, from, to, radius) =>
    `Based on the ${f.int(count)} nearest sale${s(count)}, ${from === to ? `in ${to}` : `${from} to ${to}`}, within ${f.int(radius)} m.`,
  communeBasis: (count) => `Based on the ${f.int(count)} most recent sales in the municipality.`,
  noSale: "No recent sale on record within 1 km.",
  notPublished: (commune) =>
    `In Alsace and Moselle, property sales are recorded in the local land register (Livre foncier) and are not published in the DVF database: no sale prices for this ${commune ? "municipality" : "address"}.`,
  mapHint:
    "Click a coloured plot to see its sales. Zoom in or out to bring them into view if needed.",
  list: {
    title: "Sales, address by address",
    intro: (sales, buildings) =>
      `${f.int(sales)} sale${s(sales)} across ${f.int(buildings)} plot${s(buildings)}. In Paris and other large cities a plot is often a whole apartment block, so several flat sales on the same one are common.`,
    head: { date: "Date", type: "Property", surface: "Floor area", price: "Price", perSqm: "€/m²" },
    parcel: (section, number) => `Plot ${section} ${number}`,
    unknownParcel: "Plot not given",
    atAddress: "at this address",
    distance: (meters) => `${f.int(Math.round(meters / 10) * 10)} m away`,
    dwellings: (n) => `${f.int(n)} dwelling${s(n)}`,
    floors: (n) => `${n} storey${n === 1 ? "" : "s"}`,
    built: (period) => `built ${period}`,
    median: (pricePerSqm) => `median €${f.int(pricePerSqm)}/m²`,
    saleDwellings: (n) => `${n} dwellings`,
    surface: (m2) => `${f.int(m2)} m²`,
    price: (euros) => `€${f.int(euros)}`,
    perSqm: (euros) => f.int(euros),
    date: (iso) => f.dateShort(iso),
    propertyTypes: { Appartement: "Flat", Maison: "House", Dépendance: "Outbuilding" },
    more: (n) => (n === 1 ? "Show the other property" : `Show the other ${n} properties`),
    periods: {
      AVANT_1949: "before 1949",
      DE_1949_A_1960: "between 1949 and 1960",
      DE_1961_A_1974: "between 1961 and 1974",
      DE_1975_A_1993: "between 1975 and 1993",
      DE_1994_A_2000: "between 1994 and 2000",
      DE_2001_A_2010: "between 2001 and 2010",
      APRES_2011: "since 2011",
    },
    periodSource: {
      rnc: "Period declared in the national register of co-owned buildings (RNC)",
      "fichiers-fonciers": "Year from the land files (DGFiP), rounded to a period",
    },
    usages: {
      "Résidentiel collectif": "Apartment block",
      "Résidentiel individuel": "Detached house",
      "Tertiaire & Autres": "Commercial",
      Dépendance: "Outbuilding",
      Secondaire: "Secondary",
    },
    source:
      "Sales: DVF (DGFiP), latest two published years. Buildings: national buildings database (BDNB, CSTB), drawing on the register of co-owned buildings and the land files; the construction period is the register's where the building is listed.",
  },
};
