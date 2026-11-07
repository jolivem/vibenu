/**
 * Les sections du comparatif `/commune/<ville>/arrondissements`.
 *
 * Troisième espace d'ancres des pages commune, disjoint de `sections.ts` (arrondissement) et
 * de `hubSections.ts` (ville) : une ancre est une adresse publique, et ce comparatif n'a ni
 * les rubriques de l'un ni celles de l'autre. Comme eux, une table exhaustive : un id ajouté
 * ne compile pas sans titre, colonnes et condition d'affichage.
 */

import { FEATURES } from "@/lib/site-features";
import { valeursDe } from "@/lib/comparison/build";
import { extremes } from "@/lib/comparison/rank";
import type { Comparaison, IndicateurComparableId } from "@/lib/comparison/types";
import type { City } from "@/lib/commune-slugs";
import type { MethodeAnchor } from "./methode";

/** L'adresse publique du comparatif d'une ville. */
export const comparatifPath = (city: City) => `/commune/${city}/arrondissements`;

export const COMPARATIF_SECTION_ORDER = [
  "achat-location",
  "population",
  "ages-familles",
  "logement",
  "emploi",
  "securite",
  "elections",
  "faq",
] as const;

export type ComparatifSectionId = (typeof COMPARATIF_SECTION_ORDER)[number];
export type ComparatifThemeId = Exclude<ComparatifSectionId, "faq">;

export const COMPARATIF_SECTION_TITLES: Record<ComparatifSectionId, string> = {
  "achat-location": "Achat & location",
  population: "Population et revenus",
  "ages-familles": "Âges et familles",
  logement: "Logement",
  emploi: "Emploi",
  securite: "Sécurité",
  elections: "Élections",
  faq: "Questions fréquentes",
};

export interface ComparatifTheme {
  /** L'indicateur qui décide de l'affichage de la section. */
  phare: IndicateurComparableId;
  /** Les graphes en colonnes, dans l'ordre ; chacun disparaît sous `MIN_CLASSES` valeurs. */
  graphes: IndicateurComparableId[];
  /** Les colonnes du tableau, dans l'ordre. */
  colonnes: IndicateurComparableId[];
  /** Ce que la source en une ligne nomme, et l'ancre de sa méthode. */
  source: string;
  methode: MethodeAnchor;
  actif: boolean;
}

export const COMPARATIF_THEMES: Record<ComparatifThemeId, ComparatifTheme> = {
  "achat-location": {
    phare: "prixAppartement",
    graphes: ["prixAppartement", "loyerAppartement"],
    colonnes: ["prixAppartement", "ventesAppartement", "loyerAppartement"],
    source: "DVF, ventes d'appartements des 24 derniers mois ; ANIL, loyers d'annonce",
    methode: "prix",
    actif: FEATURES.showRealEstate,
  },
  population: {
    phare: "revenuMedian",
    graphes: ["revenuMedian", "tauxPauvrete"],
    colonnes: ["population", "revenuMedian", "tauxPauvrete"],
    source: "INSEE, recensement et Filosofi, données IRIS agrégées",
    methode: "population",
    actif: FEATURES.showDemographics,
  },
  "ages-familles": {
    phare: "part0_14",
    graphes: ["part0_14", "couplesAvecEnfants", "part75Plus"],
    colonnes: ["part0_14", "couplesAvecEnfants", "part75Plus"],
    source: "INSEE, recensement, données IRIS agrégées",
    methode: "population",
    actif: FEATURES.showDemographics,
  },
  logement: {
    phare: "proprietaires",
    graphes: ["proprietaires", "hlm", "residencesSecondaires", "logementsVacants"],
    colonnes: ["proprietaires", "hlm", "residencesSecondaires", "logementsVacants"],
    source: "INSEE, recensement",
    methode: "logement",
    actif: FEATURES.showHousing,
  },
  emploi: {
    phare: "chomage",
    graphes: ["chomage", "diplomesSuperieur"],
    colonnes: ["chomage", "diplomesSuperieur"],
    source: "INSEE, recensement",
    methode: "emploi",
    actif: FEATURES.showEmployment,
  },
  securite: {
    phare: "cambriolages",
    graphes: ["cambriolages", "violencesPhysiques", "volsDansVehicules"],
    colonnes: [
      "cambriolages",
      "cambriolagesFaits",
      "violencesPhysiques",
      "violencesPhysiquesFaits",
      "volsDansVehicules",
      "volsDansVehiculesFaits",
    ],
    source: "SSMSI, faits enregistrés par la police et la gendarmerie",
    methode: "securite",
    actif: FEATURES.showSecurity,
  },
  elections: {
    phare: "participationPresidentielle",
    graphes: ["participationPresidentielle"],
    colonnes: ["participationPresidentielle"],
    source: "ministère de l'Intérieur, présidentielle 2022",
    methode: "elections",
    actif: FEATURES.showElections,
  },
};

/** Une section ne s'affiche que si son indicateur phare classe au moins `MIN_CLASSES` arrondissements. */
export function comparatifSectionContent(
  comparaison: Comparaison,
  nbFaqItems: number,
): Record<ComparatifSectionId, boolean> {
  const theme = (id: ComparatifThemeId) => {
    const t = COMPARATIF_THEMES[id];
    return t.actif && extremes(valeursDe(comparaison, t.phare)) !== null;
  };
  return {
    "achat-location": theme("achat-location"),
    population: theme("population"),
    "ages-familles": theme("ages-familles"),
    logement: theme("logement"),
    emploi: theme("emploi"),
    securite: theme("securite"),
    elections: theme("elections"),
    faq: nbFaqItems > 0,
  };
}
