import type { RealEstateMessages } from "../../fr/analysis/realEstate";

export const realEstate: RealEstateMessages = {
  title: "Property",
  median: (pricePerSquareMeter) => `Median: €${pricePerSquareMeter}/m²`,
  transactions: (count) => `Nearby sales shown on the map: ${count ?? "n/a"}`,
  mapHint:
    "Click a coloured area to see the details of the sale. Zoom in or out to bring them into view if needed.",
};
