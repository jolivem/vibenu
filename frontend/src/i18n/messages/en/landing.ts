import type { LandingMessages } from "../fr/landing";
import { BRANDING } from "@/lib/site-features";
import { site } from "./site";

const COUNT_WORDS = [
  "zero", "one", "two", "three", "four", "five",
  "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
];

export const landing: LandingMessages = {
  nav: {
    howItWorks: "How it works",
    explore: "Explore by commune",
    faq: "Questions",
    about: "About",
  },
  hero: {
    eyebrow: "Open data · France",
    title: "Check a French address",
    emphasis: "before you rent or buy.",
    lead: site.description,
    trust: ["Free", "No sign-up", "Official sources"],
  },
  description: site.description,
  discover: {
    title: ["What you ", "find out", ""],
    count: (n) => {
      const word = COUNT_WORDS[n] ?? String(n);
      return `${word.charAt(0).toUpperCase()}${word.slice(1)} dimensions`;
    },
  },
  features: {
    immobilier: {
      blurb:
        "Recent sales from the DVF register and prices per m², placed on the map. Cadastral plot, zoning under the local plan (PLU) and planning restrictions. Property tax, transfer duty and the commune's accounts.",
      schemaLabel: "Property prices (DVF), cadastre, PLU zoning and local taxes",
    },
    proximite: {
      blurb:
        "Schools, pharmacies, shops, parks: everyday services and how long it takes to walk there. In Paris, the catchment secondary school.",
      schemaLabel: "Shops, schools and services nearby",
    },
    deplacer: {
      blurb:
        "Bus, tram, metro, RER, railway station. The nearest stops and the walking time to reach them.",
      schemaLabel: "Public transport and stations",
    },
    environnement: {
      blurb: "Temperature, rainfall and sunshine month by month, 1991-2020 normals.",
      schemaLabel: "Climate (Météo-France normals)",
    },
    securite: {
      blurb:
        "Burglaries, thefts, criminal damage, violence: ten years of offences recorded by the police and gendarmerie, at commune level.",
      schemaLabel: "Recorded crime (SSMSI)",
    },
    risques: {
      blurb:
        "Flooding, clay shrink-swell, earthquake, radon, classified industrial sites. The level of exposure, overlaid on the map.",
      schemaLabel: "Natural and technological risks (Géorisques)",
    },
    population: {
      blurb:
        "Age, income, qualifications, household composition, housing stock. At the level of the IRIS statistical neighbourhood, compared with the commune and with France.",
      schemaLabel: "Population, housing and income (INSEE, IRIS neighbourhood)",
    },
    elections: {
      blurb:
        "2026 municipal and 2022 presidential elections: results in the commune, turnout, gap with the national vote.",
      schemaLabel: "Election results by commune",
    },
    histoire: {
      blurb:
        "The address on historical IGN maps and aerial photographs, from the Cassini map to today, with the outline of the plot.",
      schemaLabel: "Historical maps and aerial photographs (IGN)",
    },
  },
  environnementWithAirQuality: {
    blurb:
      "Temperature, rainfall and sunshine month by month, 1991-2020 normals. Daily air quality index for the last few days.",
    schemaLabel: "Climate (Météo-France normals) and air quality",
  },
  steps: {
    title: ["How it ", "works", ""],
    meta: "Three steps",
    items: [
      {
        title: "Enter the address",
        text: "Any address in France, from a Paris studio to a house in the countryside.",
      },
      {
        title: "The analysis runs",
        text: "Public databases are cross-checked automatically in a few seconds.",
      },
      {
        title: "Decide with confidence",
        text: "An interactive map and indicators so you rent or buy knowing the facts.",
      },
    ],
  },
  explore: {
    title: ["Explore by ", "commune", ""],
    meta: "Dedicated pages · aggregated data",
    languageNote: "(in French)",
    cities: {
      paris: {
        region: "Île-de-France",
        name: "Paris",
        text: "The 20 arrondissements analysed: property prices, demographics, amenities, air quality and election results.",
        cta: "See the 20 arrondissements →",
      },
      lyon: {
        region: "Auvergne-Rhône-Alpes",
        name: "Lyon",
        text: "The 9 arrondissements analysed: prices, demographics, amenities, air quality.",
        cta: "See the 9 arrondissements →",
      },
      marseille: {
        region: "Provence-Alpes-Côte d'Azur",
        name: "Marseille",
        text: "The 16 arrondissements analysed: prices, demographics, amenities, air quality.",
        cta: "See the 16 arrondissements →",
      },
    },
    soon: {
      eyebrow: "Coming soon",
      name: "Top 500 communes",
      text: "Every French town with more than 20,000 inhabitants.",
      cta: "In preparation",
    },
  },
  faq: {
    title: ["Frequently asked ", "questions", ""],
    meta: "About the service",
    items: ({ showAirQuality, hasSEOPages }) => [
      {
        question: `Is ${BRANDING.name} free?`,
        answer:
          "Yes. Analysing a French address is entirely free and needs no sign-up. The service relies on open public data.",
      },
      {
        question: "Where does the data come from?",
        answer:
          "Every figure comes from an official public source: DVF (the tax authority's register of property sales) for prices, Géorisques for natural and technological risks, IGN and the Géoportail de l'Urbanisme for plots, the local plan (PLU) and flood-risk prevention zoning, INSEE for population, income, employment and housing, INSEE's permanent database of facilities and OpenStreetMap for shops and local services, transport.data.gouv.fr for transport, Météo-France for climate, " +
          (showAirQuality ? "Atmo France for air quality, " : "") +
          "SSMSI (the Interior Ministry's statistical service) for crime, the Interior Ministry for elections, the City of Paris for school catchment areas, and IGN for address search, base maps and historical aerial views. Each figure stays tied to its source and publication date. Only the “In brief” sentences under the section titles are written by a language model: it rewords those same figures and invents none.",
      },
      {
        question: "Which addresses can I analyse?",
        answer:
          "Any address in mainland France and in the overseas departments and regions, from a Paris studio to a house in the countryside.",
      },
      {
        question: "Can I analyse a whole commune?",
        answer:
          "Yes: type the name of a commune instead of an address. The analysis switches to commune level — price per m² across the commune, population, safety, elections, climate and natural risks. What only makes sense at a precise point then disappears: cadastral plot, PLU zone, shops within walking distance and school catchment." +
          (hasSEOPages
            ? " Paris, Lyon and Marseille are the exception: searching for the whole city opens a page listing its arrondissements, because INSEE and the facilities databases only publish their figures arrondissement by arrondissement — an average “Paris” price does not exist in this data. Each arrondissement then has its own page (in French) and its detailed analysis, reachable from “Explore by commune”."
            : ""),
      },
      {
        question: "How long does an analysis take?",
        answer: `A few seconds. ${BRANDING.name} queries the public databases in parallel and brings the results together on an interactive map.`,
      },
      {
        question: "Are the prices per m² reliable?",
        answer:
          "Prices come from the DVF database (Demandes de Valeurs Foncières) published by the French state, which records actual property transactions registered by notaries. The figures are sales that really took place.",
      },
    ],
  },
  footer: {
    baseline: "French open data · Free, no sign-up",
  },
};
