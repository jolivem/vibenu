import { createFormat } from "../../../format";

const f = createFormat("fr");

/** Card « Immobilier » : transactions DVF autour de l'adresse ou dans la commune. */
export const realEstate = {
  title: "Immobilier",
  median: (pricePerSquareMeter: number) => `Médiane : ${f.int(pricePerSquareMeter)} €/m²`,
  /** Sous la médiane : ce qu'elle représente pour un logement type, arrondi au millier. */
  example: (surface: number, price: number) => `Soit environ ${f.int(price)} € pour ${surface} m².`,
  transactions: (count: number | null | undefined) =>
    `Transactions proches affichées sur la carte : ${count ?? "n/a"}`,
  mapHint:
    "Cliquez sur une surface colorée pour afficher le détail de la vente. Zoomez ou dézoomez pour les faire apparaître si nécessaire.",
};

export type RealEstateMessages = typeof realEstate;
