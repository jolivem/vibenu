/** Card « Immobilier » : transactions DVF autour de l'adresse ou dans la commune. */
export const realEstate = {
  title: "Immobilier",
  median: (pricePerSquareMeter: number) => `Médiane : ${pricePerSquareMeter} €/m²`,
  transactions: (count: number | null | undefined) =>
    `Transactions proches affichées sur la carte : ${count ?? "n/a"}`,
  mapHint:
    "Cliquez sur une surface colorée pour afficher le détail de la vente. Zoomez ou dézoomez pour les faire apparaître si nécessaire.",
};

export type RealEstateMessages = typeof realEstate;
