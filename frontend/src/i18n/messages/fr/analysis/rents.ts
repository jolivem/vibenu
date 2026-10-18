import type { RentLevelDto, RentTypeDto } from "@/types/location-analysis";
import { createFormat } from "../../../format";

const f = createFormat("fr");

const perM2 = (v: number) => `${f.fixed(v, 1)} €/m²`;

/** Card « Loyers » : loyers d'annonce de la commune et carte des communes alentour. */
export const rents = {
  title: "Loyers",
  /** Ligne de tête : ce que mesurent les chiffres, sur un ton descriptif. */
  caveat: (commune: string | null, annee: number) =>
    `Loyers d'annonce ${commune ? `à ${commune}` : "de la commune"}, charges comprises, logements non meublés, ` +
    `estimés à l'échelle de la commune (3e trimestre ${annee}).`,
  groups: { appartements: "Appartements", maisons: "Maisons" },
  types: {
    app: "Tous types",
    app12: "1-2 pièces",
    app3: "3 pièces et plus",
    // Sous le titre « Maisons » : ne pas le répéter.
    maison: "Toutes tailles",
  } satisfies Record<RentTypeDto, string>,
  perM2,
  range: (low: number, high: number) => `fourchette ${f.fixed(low, 1)} – ${f.fixed(high, 1)}`,
  /** Mention discrète sous un indicateur estimé ailleurs qu'à la commune, ou sur peu d'annonces. */
  levelNote: {
    commune: "",
    maille: "estimé sur un groupe de communes voisines",
    epci: "estimé sur l'intercommunalité",
  } satisfies Record<RentLevelDto, string>,
  fewListings: "peu d'annonces",
  /** Pages commune : « +8 % vs moyenne parisienne (29,3 €/m²) ». */
  vsCity: (pct: number, adjectif: string, reference: number) =>
    `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${f.int(Math.abs(pct))} % vs moyenne ${adjectif} (${perM2(reference)})`,
  examplesLead: "Soit environ, par mois :",
  /** En-têtes du tableau d'exemples. */
  examplesHead: { dwelling: "Logement", low: "Basse", estimate: "Estimation", high: "Haute" },
  /** « 1 pièce, » puis la surface, mise en gras à part. */
  exampleRooms: (pieces: number) => `${pieces === 1 ? "1 pièce" : `${pieces} pièces`}, `,
  exampleSurface: (surface: number) => `${surface} m²`,
  monthly: (amount: number) => `${f.spaced(amount)} €`,
  mapTitle: "Loyer des appartements alentour (€/m²)",
  mapAria: "Carte des loyers des appartements dans les communes alentour",
  /** Légende d'une classe de la carte : « 18 – 20 ». */
  classLabel: (low: number | null, high: number | null) =>
    low === null ? `moins de ${f.decimal(high!, 1)}` : high === null ? `${f.decimal(low, 1)} et plus` : `${f.decimal(low, 1)} – ${f.decimal(high, 1)}`,
  /** Fiche PDF. */
  pdfLabel: "Loyers",
  pdfLine: (app: number, app12: number | null, app3: number | null, maison: number | null) =>
    `Appartements ${perM2(app)}` +
    (app12 !== null && app3 !== null ? ` (1-2 pièces ${f.fixed(app12, 1)} · 3 pièces et + ${f.fixed(app3, 1)})` : "") +
    (maison !== null ? ` · Maisons ${perM2(maison)}` : ""),
};

export type RentsMessages = typeof rents;
