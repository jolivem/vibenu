import type { AboutMessages } from "../fr/about";

export const about: AboutMessages = {
  meta: {
    title: "About — What ClaireAdresse is for",
    description:
      "ClaireAdresse brings together French public data (DVF, Géorisques, cadastre, INSEE) to help tenants and buyers check an address before they commit.",
    openGraphDescription:
      "Why ClaireAdresse exists, which data we use and how we keep it reliable.",
    schemaName: "About ClaireAdresse",
    schemaDescription:
      "Mission, data sources and methodology of the ClaireAdresse address analysis service.",
  },
  hero: {
    eyebrow: "About",
    title: "Public data,",
    emphasis: "readable by everyone.",
    lead: "ClaireAdresse gathers on a single screen information scattered across a dozen French public databases. Our aim: to let anyone about to rent or buy understand a neighbourhood in a few seconds, without clicking through ten government websites.",
  },
  mission: {
    title: ["Our ", "mission", ""],
    meta: "Why this service",
    paragraphs: [
      "Information about housing exists — it is even public. But it remains scattered: Géorisques for natural risks, DVF for prices, the Géoportail de l'Urbanisme for the local plan (PLU), INSEE for demographics, transport.data.gouv.fr for mobility, Météo-France for climate, the Interior Ministry for elections. Cross-checking all of it before a viewing or a signature takes hours.",
      "ClaireAdresse does that work for you. You enter an address, we query the official sources and present a clear summary on a map. The service is free, needs no sign-up and works in any browser.",
    ],
  },
  sources: {
    title: ["Our ", "sources", ""],
    meta: "Open data",
    items: [
      {
        name: "DVF",
        issuer: "DGFiP / data.gouv.fr",
        desc: "Demandes de Valeurs Foncières — every property transaction registered in France since 2014.",
      },
      {
        name: "Géorisques",
        issuer: "BRGM · Ministry for the Ecological Transition",
        desc: "Eighteen hazards read at the address: flooding, clay shrink-swell, earthquake, radon, ground movement, wildfire, classified installations, soil pollution, dam failure, mining risk…",
      },
      {
        name: "Cadastre & planning",
        issuer: "IGN · Géoportail de l'Urbanisme",
        desc: "Cadastral plots, planning zones (PLU, PLUi, cartes communales) and public easements — including the flood-risk prevention plan zoning drawn on the risk map.",
      },
      {
        name: "Census & income",
        issuer: "INSEE — 2021 census, Filosofi",
        desc: "Population, housing, employment, qualifications and income at IRIS level, the statistical unit that divides communes into neighbourhoods.",
      },
      {
        name: "Shops & amenities",
        issuer: "INSEE (BPE) · OpenStreetMap",
        desc: "Schools, pharmacies, doctors, shops, parks and sports facilities around the address, with their distance.",
      },
      {
        name: "Transport",
        issuer: "transport.data.gouv.fr",
        desc: "Bus, metro, tram and RER stops and railway stations, from the GTFS feeds of the transport authorities.",
      },
      {
        name: "Climate normals",
        issuer: "Météo-France · meteo.data.gouv.fr",
        desc: "Temperature, rainfall and sunshine month by month over the 1991-2020 reference period, by weather station.",
      },
      {
        id: "air",
        name: "Air quality",
        issuer: "Atmo France · LCSQA",
        desc: "Daily air quality index and the nearest monitoring stations.",
      },
      {
        name: "Recorded crime",
        issuer: "SSMSI · Interior Ministry",
        desc: "Offences recorded by the police and gendarmerie over ten years, at commune level — the finest level published.",
      },
      {
        name: "Local taxation",
        issuer: "DGFiP · data.economie.gouv.fr",
        desc: "Property tax and waste collection tax rates, second homes, transfer duties and municipal accounts.",
      },
      {
        name: "Election results",
        issuer: "Interior Ministry / data.gouv.fr",
        desc: "2026 municipal and 2022 presidential elections, aggregated by commune and arrondissement.",
      },
      {
        name: "Addresses & base maps",
        issuer: "IGN · Géoplateforme (BAN)",
        desc: "Address search, geocoding, vector street maps, aerial photographs and LiDAR relief shading.",
      },
      {
        name: "Historical maps",
        issuer: "IGN · Géoplateforme",
        desc: "The Cassini map, the État-major map and aerial photographs since the 1950s.",
      },
      {
        name: "School catchment",
        issuer: "City of Paris — opendata.paris.fr",
        desc: "Secondary school (collège) catchment areas, available for Paris only.",
      },
    ],
  },
  method: {
    title: ["Our ", "methodology", ""],
    meta: "How we handle the data",
    paragraphs: [
      "We do not reinvent the data: we relay it. Every indicator shown points back to a verifiable official source. Prices per m² come only from actual transactions registered by notaries (DVF). Risks are those published by state services. Planning zones are those uploaded by communes to the Géoportail de l'Urbanisme.",
      "The “In brief” sentences under the section titles are the only ones written by a language model. The division of roles is strict: trends, gaps from the national figure and extreme values are computed by the program, against explicit thresholds; the model only receives those conclusions — “down 31%”, never ten raw numbers — and puts them into words. It rewords, it does not calculate and adds no figure. When it is unavailable, the section simply appears without its sentence.",
      [
        "Two readings of risk coexist, and they do not say the same thing. The list of hazards is read ",
        { strong: "at the address" },
        ": it answers “is this home affected”. The map shows the zoning ",
        { strong: "around" },
        " the place. A home outside a flood zone may well have one a few streets away — that is not a contradiction, it is the difference between a point and its surroundings.",
      ],
      "We always state when each source was last updated. When data is unavailable for an address (a commune that has not yet published its PLU, few DVF transactions in sparsely populated areas), we say so rather than hide it.",
    ],
  },
  limits: {
    title: ["The ", "limits", " of the exercise"],
    meta: "Read before you decide",
    paragraphs: [
      "Public data is not infallible. It can be wrong, incomplete or behind the situation on the ground: a closed shop still appears in the facilities inventory, a sale only shows up in DVF several months after signing, a risk prevention plan is sometimes published only as an outline. We correct what we spot, but cannot guarantee that every figure is accurate.",
      "Most indicators also describe an area larger than the home itself: an IRIS neighbourhood, a commune, a radius around the address. They tell you what surrounds a property, not the condition of the property.",
      "ClaireAdresse is a starting point, not an opinion. Before any decision — buying, renting, building work — check this information on site, by visiting, at different times of day if you can, and with local sources: the town hall for the PLU and upcoming projects, the risk statement attached to the sale agreement or the lease, the technical surveys, the notary, the agency, the neighbours.",
    ],
  },
  press: {
    title: ["", "Press", ""],
    meta: "For journalists",
    paragraphs: [
      "ClaireAdresse is a free website, with no sign-up, that brings together on a map what public data says about an address or a commune in France: actual sale prices, risks, planning, transport, amenities, population, crime, climate, elections, historical aerial photographs. Each indicator is shown in its own unit and compared with a benchmark, with no overall score. The site is developed and published by a private individual.",
    ],
    contact: [
      "On request: the analysis of an address or neighbourhood of your choice, figures computed for an area from the same data, screenshots and the logo. Write to ",
      ".",
    ],
  },
  glossary: {
    title: ["A short ", "glossary", ""],
    meta: "French terms kept as they are",
    items: [
      { term: "Commune", definition: "The smallest unit of local government in France: a town, a village or a city. There are about 35,000." },
      { term: "Arrondissement", definition: "A district of Paris, Lyon or Marseille. Each is treated here as its own commune." },
      { term: "Département", definition: "One of the 101 administrative areas between the commune and the region, roughly a county." },
      { term: "DVF", definition: "Demandes de Valeurs Foncières: the tax authority's public register of every property sale, with its price." },
      { term: "Cadastre", definition: "The official land register, which divides the country into numbered plots." },
      { term: "PLU / PLUi", definition: "Plan local d'urbanisme: the commune's (or group of communes') local plan, which says what may be built where. Zones are U (urban), AU (to be developed), A (agricultural), N (natural)." },
      { term: "PPR / PPRI", definition: "Plan de prévention des risques: a state document that maps hazard zones — flooding for a PPRI — and restricts building in them." },
      { term: "ICPE", definition: "A classified installation: an industrial or agricultural site subject to environmental authorisation." },
      { term: "IRIS", definition: "INSEE's statistical neighbourhood, of about 2,000 inhabitants. Census figures are published at this level." },
      { term: "INSEE", definition: "The French national statistics office." },
      { term: "BPE", definition: "Base permanente des équipements: INSEE's inventory of shops, services and facilities." },
      { term: "SSMSI", definition: "The Interior Ministry's statistical service, which publishes recorded crime figures." },
      { term: "Taxe foncière", definition: "The annual property tax paid by owners. Its rate is voted locally and applied to a notional rental value of the property." },
      { term: "TEOM", definition: "Taxe d'enlèvement des ordures ménagères: the waste collection tax, charged on the same notice as the property tax." },
      { term: "Taxe d'habitation", definition: "A residence tax that now applies only to second homes; communes in high-demand areas may add a surcharge." },
      { term: "TLV", definition: "Taxe sur les logements vacants: a tax on homes left empty, in communes where housing is in short supply." },
      { term: "Droits de mutation", definition: "Transfer duties paid by the buyer of a property, the main part of what is commonly called “notary fees”." },
      { term: "HLM", definition: "Social rented housing." },
      { term: "Collège / lycée", definition: "Lower secondary school (ages 11-15) and upper secondary school (ages 15-18). State schools recruit from a catchment area." },
      { term: "RER", definition: "The regional express rail network of the Paris area." },
      { term: "DGFiP, IGN, BRGM", definition: "The public finance directorate, the national mapping agency and the geological survey: three of the state bodies whose data is used here." },
    ],
  },
  footer: {
    analyze: "Analyse an address",
    contact: "Contact",
  },
};
