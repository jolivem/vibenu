import type { RisksMessages } from "../../fr/analysis/risks";
import { createFormat } from "../../../format";

const f = createFormat("en");

export const risks: RisksMessages = {
  title: "Natural risks",
  noHighlighted: "No risk is recorded here at a high or moderate level.",
  levels: {
    élevé: "High",
    modéré: "Moderate",
    présent: "Reported",
    faible: "Low",
    inconnu: "No data",
    absent: "None",
  },
  unavailableBadge: "Unavailable",
  names: {
    inondation: "Flood risk",
    remonteeNappe: "Groundwater flooding",
    risqueCotier: "Coastal flooding",
    seisme: "Seismic risk",
    mouvementTerrain: "Ground movement",
    reculTraitCote: "Coastal erosion",
    retraitGonflementArgile: "Clay shrink-swell",
    avalanche: "Avalanche risk",
    feuForet: "Wildfire",
    eruptionVolcanique: "Volcanic eruption",
    cyclone: "Cyclone",
    radon: "Radon exposure",
    icpe: "Classified installation (ICPE)",
    nucleaire: "Nuclear risk",
    canalisationsMatieresDangereuses: "Hazardous pipelines",
    pollutionSols: "Soil pollution",
    ruptureBarrage: "Dam failure",
    risqueMinier: "Mining risk",
  },
  // `detail` is the status as published by Géorisques, quoted in French.
  message: (p) => {
    if (p.unavailable) {
      return "Géorisques data unavailable — check manually on georisques.gouv.fr.";
    }
    if (p.clayMap && (p.level === "élevé" || p.level === "modéré" || p.level === "faible")) {
      const exposure = { élevé: "⚠️ High exposure", modéré: "Medium exposure", faible: "Low exposure" }[p.level];
      return `${exposure} on the 2026 clay shrink-swell exposure map (BRGM). The Géorisques report was unavailable at the time of the analysis: check on georisques.gouv.fr.`;
    }
    const suffix = p.detail ? ` (${p.detail})` : "";
    const scope = p.communeFallback ? ", at commune level — not established at the address" : "";
    switch (p.level) {
      case "absent":
        return `No ${p.name.toLowerCase()} identified in this area.`;
      case "élevé":
        return `⚠️ High level${scope}${suffix}. A specialist survey is recommended.`;
      case "modéré":
        return `Moderate level${scope}${suffix}. Worth investigating before you decide.`;
      case "présent":
        return `Reported by Géorisques${scope}${suffix}, with no published severity: check before you decide.`;
      case "faible":
        return `Low level${scope}${suffix}.`;
      case "inconnu":
        return p.communeLevel
          ? `Not known at the address; at commune level: ${p.communeLevel.toLowerCase()}${suffix}. Check on georisques.gouv.fr.`
          : "No data from Géorisques at this address. Check on georisques.gouv.fr.";
    }
  },
  explanations: {
    inondation:
      "A river bursting its banks, or surface run-off after heavy rain. The zoning covers the area: what a home actually suffers depends mostly on its floor and on whether it has a basement.",
    remonteeNappe:
      "The water table rising to the surface. It floods cellars and basements without any river overflowing.",
    risqueCotier:
      "The sea flooding the land during storms, when it crosses the shoreline. Distinct from erosion, which moves the coastline itself.",
    seisme:
      "Mainland France is divided into five seismic zones. The classification sets the building rules; it does not predict a noticeable earthquake.",
    mouvementTerrain:
      "Subsidence, landslides or rockfalls. Beneath a town, it is often the legacy of old underground quarries.",
    reculTraitCote: "Erosion of the shore, which moves the coastline back over several decades.",
    retraitGonflementArgile:
      "Clay soils swell in wet seasons and shrink in drought. The movement cracks the walls of houses with shallow foundations, and is one of the largest sources of natural disaster claims in France. A building on deep foundations is little affected.",
    avalanche: "Applies to mountain communes where buildings are exposed to an avalanche path.",
    feuForet:
      "Exposure to vegetation fires. It often comes with a legal obligation to clear undergrowth around buildings.",
    eruptionVolcanique:
      "Applies to communes near an active volcano — overseas territories, and the Massif Central.",
    cyclone:
      "Applies to overseas departments exposed to tropical cyclones, which have their own building rules.",
    radon:
      "A natural radioactive gas rising from the ground, with no smell or colour, that builds up in cellars and poorly ventilated rooms in contact with the soil. The classification is by commune: the actual concentration depends on the building and its ventilation, and is measured with a dosimeter left in place for a few weeks.",
    icpe:
      "Presence of industrial installations subject to authorisation. The most sensitive fall under a technological risk prevention plan, which controls building around them.",
    nucleaire: "Commune within the emergency planning zone of a nuclear installation.",
    canalisationsMatieresDangereuses:
      "A pipeline carrying gas, hydrocarbons or chemicals runs through the area. Easements limit what can be built right next to it.",
    pollutionSols:
      "Trace of past industrial activity in the area, listed in the polluted soil databases. The assessment is made plot by plot.",
    ruptureBarrage: "Commune within the theoretical flood wave of a large dam.",
    risqueMinier:
      "Aftermath of old mining: subsidence, localised collapses or rising water.",
  },
  catnat: {
    title: "Recognised natural disasters",
    summary: (total, villeEntiere) =>
      total === 0
        ? "No recognised natural disaster for the municipality since 1982."
        : `${f.int(total)} recognised natural disaster${total > 1 ? "s" : ""} since 1982, ${villeEntiere ? "for the whole city (the decrees do not distinguish arrondissements)" : "for the municipality"}.`,
    peril: (name, count, lastYear) => `${name}: ${f.int(count)} (latest episode in ${lastYear})`,
    perils: {
      ICB: "Floods and mudflows",
      SEC: "Drought (clay soils)",
      MVT: "Ground movements",
      TMP: "Storm",
      CMV: "Wave impact",
      GLT: "Landslide",
      PDN: "Snow load",
      IRN: "Groundwater flooding",
      GRL: "Hail",
      SEI: "Earthquake",
      AVA: "Avalanche",
      EFA: "Subsidence or collapse",
      VCY: "Cyclonic winds",
      DIV: "Other",
      ECB: "Rockfall",
      RAZ: "Tidal wave",
      LVT: "Debris flow",
      COB: "Mudflow",
      GET: "Landslide and subsidence",
      VOL: "Volcanic eruption",
      GER: "Landslide and rockfall",
    },
    source: (dataUpTo) =>
      `GASPAR database (Géorisques)${dataUpTo ? `, decrees published in the Journal officiel up to ${f.dateLong(dataUpTo)}` : ""}. A recognition opens compensation for those affected in the municipality; it does not mean every home was hit.`,
  },
  pdf: {
    othersLabel: "Other risks",
    other: (name, level) => `${name} (${level.toLowerCase()})`,
    withCommuneLevel: (name, level) => `${name} — at municipality level: ${level.toLowerCase()}`,
    none: "No natural risk on record.",
  },
};
