import { createFormat } from "../../../format";

const f = createFormat("fr");

/** « 23 arrêts de bus ou tram », « 1 gare ou station », « aucun arrêt… ». */
function counted(count: number, zero: string, one: string, many: string): string {
  return count === 0 ? zero : `${count} ${count > 1 ? many : one}`;
}

/**
 * Textes propres à la fiche PDF. Elle s'imprime pour retenir et comparer, pas pour
 * explorer : des faits courts, une ligne par information. Le reste vient des messages
 * des cards, partagés avec l'écran.
 */
export const pdf = {
  documentTitle: (address: string) => `Fiche · ${address}`,
  subject: "Fiche de synthèse d'une adresse",
  eyebrow: "Fiche de synthèse",
  /** Préfixe du nom de fichier, et nom de repli quand l'adresse ne donne rien. */
  filePrefix: "fiche",
  fileFallback: "analyse",
  date: (date: Date) => date.toLocaleDateString(f.tag, { day: "2-digit", month: "long", year: "numeric" }),
  insightTag: "EN BREF",
  /** Entre l'étiquette d'un fait et sa valeur : le français met une espace avant les deux-points. */
  labelSeparator: " : ",
  notes: {
    origin: "Les chiffres viennent directement des fichiers publics.",
    sources:
      "Sources : IGN · DVF · DGFiP · Géorisques · INSEE · Ministère de l'Intérieur · Météo-France · ATMO · Éducation nationale.",
    /** Suivi de l'adresse de la page en ligne. */
    onlineLead: "Détail, graphes et cartes : ",
  },
  property: {
    marketLabel: "Marché",
    median: (pricePerSquareMeter: number) => `prix médian ${f.spaced(Math.round(pricePerSquareMeter))} €/m²`,
    transactions: (count: number) =>
      `${count} transaction${count > 1 ? "s" : ""} proche${count > 1 ? "s" : ""}`,
    noSale: "aucune vente récente recensée",
    parcelLabel: "Parcelle",
    parcel: (surface: string, section: string, numero: string) =>
      `${surface} · section ${section} n° ${numero}`,
    zoneLabel: "Zone PLU :",
    prescriptionsLabel: "Prescriptions",
  },
  nearby: {
    radius: (meters: number) => `Dans un rayon de ${meters} m`,
    restaurants: "Restaurants",
    /** « Pharmacie des Terreaux (4 min à pied) ». */
    closest: (name: string, proximity: string) => `${name} (${proximity})`,
    /** Nombre dans le rayon, suivi s'il existe de l'équipement le plus proche. */
    count: (count: number | null, closest: string) => {
      if (count === null) return closest;
      if (count === 0) return closest ? `aucun dans le rayon — le plus proche : ${closest}` : "aucun dans le rayon";
      return closest ? `${count} — le plus proche : ${closest}` : String(count);
    },
    arrondissementNote:
      "La BPE rattache certains équipements à l'adresse de leur gestionnaire : à l'échelle d'un arrondissement, les nombres peuvent être surestimés ou sous-estimés.",
  },
  transport: {
    stops: (count: number) =>
      counted(count, "aucun arrêt de bus ou tram", "arrêt de bus ou tram", "arrêts de bus ou tram"),
    stations: (count: number) =>
      counted(count, "aucune gare ou station", "gare ou station", "gares ou stations"),
    nearestBusLabel: "Bus ou tram le plus proche",
    /** Nom d'un arrêt, suivi de sa distance en mode adresse. */
    stop: (name: string, proximity: string | null) => `${name}${proximity !== null ? ` (${proximity})` : ""}`,
    none: "Aucun arrêt trouvé à proximité.",
  },
  population: {
    scopeLabel: (commune: boolean): string => (commune ? "Commune" : "Quartier IRIS"),
  },
  elections: {
    leadingLabel: "En tête",
    participationLabel: "Participation",
    /** « Union de la gauche (Prénom NOM) 34,2 % ». */
    leadingList: (name: string, head: string | null, score: string) =>
      `${name}${head ? ` (${head})` : ""} ${score}`,
    participation: (value: string) => `participation ${value}`,
    candidate: (name: string, score: string) => `${name} ${score}`,
    participationVsFrance: (local: string, france: string) => `${local} (France ${france})`,
  },
};

export type PdfMessages = typeof pdf;
