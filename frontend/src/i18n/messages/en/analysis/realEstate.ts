import type { RealEstateMessages } from "../../fr/analysis/realEstate";
import { createFormat } from "../../../format";

const f = createFormat("en");

export const realEstate: RealEstateMessages = {
  title: "Property",
  median: (pricePerSquareMeter) => `Median: €${f.int(pricePerSquareMeter)}/m²`,
  example: (surface, price) => `That is about €${f.int(price)} for ${surface} m².`,
  transactions: (count) => `Nearby sales shown on the map: ${count ?? "n/a"}`,
  mapHint:
    "Click a coloured area to see the details of the sale. Zoom in or out to bring them into view if needed.",
};
