import type { MunicipalesListeDto } from "@/types/location-analysis";

/**
 * Couleurs et formats des cards électorales, partagés avec leur pendant PDF.
 *
 * Ils étaient recopiés dans `ElectionsCard`, `MunicipalesCard` et `PdfElections`.
 */

export const NEUTRAL_COLOR = "#6b7280";

/** Candidats de la présidentielle 2022, 1er tour. */
export const PARTI_COLOR: Record<string, string> = {
  LO: "#bf3f3f",
  PCF: "#cc0000",
  REN: "#ffc000",
  RES: "#7e857e",
  RN: "#0d3a6b",
  REC: "#1f4068",
  LFI: "#cc0066",
  PS: "#ff8da1",
  EELV: "#3aaa35",
  LR: "#1f5fbf",
  NPA: "#7a1f1f",
  DLF: "#205d96",
};

/**
 * Couleurs par nuance de liste. Les codes municipaux sont préfixés « L » (liste), et
 * l'essentiel du corpus est composé de « divers » — LDVD, LDVG, LDIV, LDVC — que l'État
 * attribue quand aucune étiquette de parti ne s'impose.
 */
export const NUANCE_COLOR: Record<string, string> = {
  LEXG: "#bf3f3f",
  LFI: "#cc0066",
  LCOM: "#cc0000",
  LSOC: "#ff8da1",
  LUG: "#e8607d",
  LVEC: "#3aaa35",
  LDVG: "#f2a0b4",
  LDIV: "#9ca3af",
  LREG: "#7c8ba1",
  LDVC: "#f0b429",
  LENS: "#ffc000",
  LMDM: "#f7a600",
  LUDI: "#4aa3df",
  LLR: "#1f5fbf",
  LDVD: "#7fa8dd",
  LUD: "#2b6fc9",
  LRN: "#0d3a6b",
  LEXD: "#1f2f4a",
  LUXD: "#16233a",
};

export function formatElectionPct(v: number): string {
  return `${v.toFixed(1).replace(".", ",")} %`;
}

export function electionDeltaLabel(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return "= national";
  const sign = rounded > 0 ? "+" : "−";
  return `${sign}${Math.abs(rounded).toFixed(1).replace(".", ",")} pts`;
}

export function siegesLabel(liste: MunicipalesListeDto): string | null {
  if (liste.siegesCm === null || liste.siegesCm === 0) return null;
  return `${liste.siegesCm} siège${liste.siegesCm > 1 ? "s" : ""}`;
}
