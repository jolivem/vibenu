import type { MobilityLabel } from "@/server-shared/domain/common.types";
import type { SecurityRating } from "@/types/location-analysis";
import { createFormat } from "../../../format";

const f = createFormat("fr");

/** Bandeau de chiffres clés, en tête de l'analyse et de la fiche PDF. */
export const keyFigures = {
  ariaLabel: "Chiffres clés",
  priceLabel: "Prix médian",
  price: (pricePerSquareMeter: number) => `${f.spaced(Math.round(pricePerSquareMeter))} €/m²`,
  transportLabel: "Transports",
  /** Niveau de desserte. Les clés sont les codes du DTO. */
  transportLevels: {
    excellent: "Excellent",
    "très bon": "Très bon",
    bon: "Bon",
    correct: "Correct",
    faible: "Faible",
  } satisfies Record<MobilityLabel, string> as Record<MobilityLabel, string>,
  nearbyLabel: (radiusMeters: number) => `À moins de ${radiusMeters} m`,
  nearbyValue: (total: number) => `${total} équipement${total > 1 ? "s" : ""}`,
  securityLabel: "Sécurité",
  /**
   * La note qualifie le lieu par rapport à la France, jamais dans l'absolu : « Moyen » ou
   * « Mauvais » se liraient comme un jugement, d'où ces formulations comparatives.
   */
  securityRatings: {
    excellent: "Bien meilleure que la moyenne France",
    bon: "Meilleure que la moyenne France",
    moyen: "Dans la moyenne France",
    mediocre: "Moins bonne que la moyenne France",
    mauvais: "Nettement moins bonne que la moyenne France",
  } satisfies Record<SecurityRating, string> as Record<SecurityRating, string>,
  /** Fiche PDF : tuile ajoutée après le prix. */
  surfaceLabel: "Surface",
};

export type KeyFiguresMessages = typeof keyFigures;
