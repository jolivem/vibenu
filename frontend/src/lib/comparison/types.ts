/**
 * Le socle des comparaisons : des lieux côte à côte, indicateur par indicateur.
 *
 * Deux pages s'en servent ou s'en serviront : le comparatif des arrondissements d'une ville
 * (`/commune/<ville>/arrondissements`, lu dans `CommuneStats`) et, plus tard, la comparaison
 * de plusieurs adresses (lue dans `LocationAnalysisDto`). Chacune a son catalogue
 * d'indicateurs — la source diffère — mais elles partagent les identifiants, les unités, les
 * libellés (`i18n/messages/<locale>/analysis/comparison.ts`) et le tableau.
 *
 * Aucun texte ici, aucune note, aucune couleur de jugement : chaque indicateur reste dans son
 * unité, comparé à des repères (ville, département, France).
 */

import type { SectionId } from "@/components/analysis/sections";

export type Unite =
  | "eurM2"
  | "eurM2Mois"
  | "eurAn"
  | "pct"
  | "habitants"
  | "ventes"
  | "pour1000Habitants"
  | "pour1000Logements"
  | "faits";

export const INDICATEURS_COMPARABLES = [
  "prixAppartement",
  "ventesAppartement",
  "loyerAppartement",
  "population",
  "revenuMedian",
  "tauxPauvrete",
  "part0_14",
  "part75Plus",
  "couplesAvecEnfants",
  "proprietaires",
  "hlm",
  "residencesSecondaires",
  "logementsVacants",
  "chomage",
  "diplomesSuperieur",
  "cambriolages",
  "violencesPhysiques",
  "volsDansVehicules",
  "cambriolagesFaits",
  "violencesPhysiquesFaits",
  "volsDansVehiculesFaits",
  "participationPresidentielle",
] as const;

export type IndicateurComparableId = (typeof INDICATEURS_COMPARABLES)[number];

/** Les repères possibles d'une comparaison. */
export type ReferenceKind = "ville" | "departement" | "france";

export interface IndicateurComparable<Src> {
  id: IndicateurComparableId;
  /** Section de l'analyse où l'indicateur se lit, pour regrouper la future comparaison d'adresses. */
  section: SectionId;
  unite: Unite;
  decimales: number;
  value: (src: Src) => number | null;
  /** Valeur publiée mais tue (secret statistique) : à dire, pas à confondre avec une absence. */
  masque?: (src: Src) => boolean;
  /** Valeur des repères, lue dans la même source. */
  references?: Partial<Record<ReferenceKind, (src: Src) => number | null>>;
}

export interface Cellule {
  valeur: number | null;
  masque: boolean;
}

export interface Lieu {
  id: string;
  nom: string;
  href?: string;
}

export interface ColonneReference {
  id: string;
  kind: ReferenceKind;
  nom: string;
  cellules: Partial<Record<IndicateurComparableId, number | null>>;
}

export interface Comparaison {
  lieux: Lieu[];
  /** Une cellule par lieu, dans l'ordre de `lieux`. */
  cellules: Partial<Record<IndicateurComparableId, Cellule[]>>;
  references: ColonneReference[];
}
