import type { KeyFiguresMessages } from "../../fr/analysis/keyFigures";
import { createFormat } from "../../../format";

const f = createFormat("en");

export const keyFigures: KeyFiguresMessages = {
  ariaLabel: "Key figures",
  priceLabel: "Median price",
  price: (pricePerSquareMeter) => `€${f.int(pricePerSquareMeter)}/m²`,
  transportLabel: "Transport",
  transportLevels: {
    excellent: "Excellent",
    "très bon": "Very good",
    bon: "Good",
    correct: "Fair",
    faible: "Poor",
  },
  nearbyLabel: (radiusMeters) => `Within ${radiusMeters} m`,
  nearbyValue: (total) => `${total} amenit${total === 1 ? "y" : "ies"}`,
  securityLabel: "Safety",
  securityRatings: {
    excellent: "Much better than the French average",
    bon: "Better than the French average",
    moyen: "Around the French average",
    mediocre: "Worse than the French average",
    mauvais: "Much worse than the French average",
  },
  surfaceLabel: "Plot area",
};
