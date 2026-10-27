import type { RentsMessages } from "../../fr/analysis/rents";
import { createFormat } from "../../../format";

const f = createFormat("en");

const perM2 = (v: number) => `€${f.fixed(v, 1)}/m²`;

export const rents: RentsMessages = {
  title: "Rents",
  caveat: (commune, annee) =>
    `Advertised rents ${commune ? `in ${commune}` : "in the commune"}, charges included, unfurnished dwellings, ` +
    `estimated at commune level (Q3 ${annee}).`,
  groups: { appartements: "Flats", maisons: "Houses" },
  types: {
    app: "All sizes",
    app12: "1-2 rooms",
    app3: "3 rooms or more",
    maison: "All sizes",
  },
  perM2,
  range: (low, high) => `range ${f.fixed(low, 1)} – ${f.fixed(high, 1)}`,
  levelNote: {
    commune: "",
    maille: "estimated over a group of neighbouring communes",
    epci: "estimated over the inter-municipal area",
  },
  fewListings: "few listings",
  vsCity: (pct, adjectif, reference) =>
    `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${f.int(Math.abs(pct))}% vs ${adjectif} average (${perM2(reference)})`,
  examplesLead: "That is roughly, per month:",
  examplesHead: { dwelling: "Dwelling", low: "Low", estimate: "Estimate", high: "High" },
  exampleRooms: (pieces) => `${pieces === 1 ? "1 room" : `${pieces} rooms`}, `,
  exampleSurface: (surface) => `${surface} m²`,
  monthly: (amount) => `€${f.spaced(amount)}`,
  mapTitle: "Flat rents nearby (€/m²)",
  mapAria: "Map of flat rents in the surrounding communes",
  classLabel: (low, high) =>
    low === null ? `under ${f.decimal(high!, 1)}` : high === null ? `${f.decimal(low, 1)} and over` : `${f.decimal(low, 1)} – ${f.decimal(high, 1)}`,
  zone: {
    summary: {
      tendue: [
        { strong: "Commune in a high-demand housing area (zone tendue)." },
        " For an unfurnished let, the tenant's notice period is one month instead of three. When the home is " +
          "re-let, the rent cannot exceed the previous tenant's.",
      ],
      touristique: [
        { strong: "Commune in a tourist high-demand area (zone touristique et tendue)." },
        " Only taxation changes: tax on vacant dwellings, possible surcharge on the second-home council tax. " +
          "The shorter notice period and the cap on rent when re-letting do not apply.",
      ],
      non: [
        { strong: "Commune outside the high-demand housing area." },
        " The shorter notice period and the cap on rent when re-letting do not apply.",
      ],
    },
    tendueDetail: (until) =>
      "The shorter notice must be claimed in the tenant's notice letter. The rent may exceed the previous one " +
      "for a first let, after more than 18 months without a tenant, after major works, or if the previous rent " +
      `was clearly below market. Rule renewed until ${f.dateLong(until)}.`,
    source: (decret) => `Zoning from the decree of ${f.dateLong(decret)}, published by the Ministry for the Ecological Transition.`,
    pdfLabel: "High-demand area",
    pdf: {
      tendue: "yes: one-month notice for unfurnished lets, rent capped when re-letting",
      touristique: "tourist high-demand area: taxation only, not the letting rules",
      non: "no",
    },
  },
  pdfLabel: "Rents",
  pdfLine: (app, app12, app3, maison) =>
    `Flats ${perM2(app)}` +
    (app12 !== null && app3 !== null ? ` (1-2 rooms ${f.fixed(app12, 1)} · 3+ rooms ${f.fixed(app3, 1)})` : "") +
    (maison !== null ? ` · Houses ${perM2(maison)}` : ""),
};
