/**
 * Trois villes couvrant les grands types de climat métropolitain, servant de repères
 * au profil mensuel local. Elles remplacent la comparaison à la moyenne France, qui
 * ne disait rien : un chiffre national moyen n'existe sous aucun climat réel.
 *
 * Les identifiants sont des NUM_POSTE Météo-France, présents dans
 * `climate_station_monthly_normales` avec les 12 mois et un ensoleillement non nul —
 * condition qui n'allait pas de soi, seules 303 des 2 899 stations portant un
 * héliographe.
 *
 * Marseille : aucune station intra-muros ne mesure l'ensoleillement (MARSEILLE-OBS,
 * ST BARNABE et STE MARTHE sont toutes vides sur cette mesure). `13054001` est
 * MARIGNANE, l'aéroport Marseille-Provence à 20 km du centre — c'est la station
 * climatologique de référence usuelle pour Marseille, mais le nom affiché diffère
 * de celui de la station, d'où la mention en note de card.
 *
 * Brest : c'est un pôle franc, et c'est voulu. La Rochelle tenait la place, à 13,6 °C,
 * 753 mm et 1 949 h de soleil — plus sèche et plus ensoleillée que l'océanique type, au
 * point d'être le repère le moins éloigné de deux tiers des stations métropolitaines.
 * Brest-Guipavas, à 11,7 °C, 1 230 mm et 1 555 h, décrit vraiment ce que le mot désigne.
 * Le prix de ce recentrage est que le milieu de la France ne ressemble plus franchement
 * à aucun des trois : c'est `climatLePlusProche` (card-insights.input.ts) qui l'assume,
 * en ne désignant un repère que lorsqu'il en devance nettement un autre.
 */
export interface ReferenceClimate {
  stationId: string;
  /** Nom affiché dans la légende. */
  name: string;
  /** Type de climat, affiché entre parenthèses. */
  climateType: string;
  /** Nom réel de la station, quand il diffère de la ville. Sinon absent. */
  stationName?: string;
}

export const REFERENCE_CLIMATES: readonly ReferenceClimate[] = [
  { stationId: "67124001", name: "Strasbourg", climateType: "continental" },
  { stationId: "13054001", name: "Marseille", climateType: "méditerranéen", stationName: "Marignane" },
  { stationId: "29075001", name: "Brest", climateType: "océanique" },
] as const;

/**
 * Normales France métropolitaine 1991-2020 — valeurs officielles Météo-France
 * (https://meteofrance.com/climat), moyennes spatiales homogénéisées sur tout le
 * territoire, référence WMO.
 *
 * Source unique : la card ne les affiche plus, mais le PDF les compare toujours.
 */
export const FRANCE_NORMALES = {
  temperatureC: 13.0,
  precipitationMm: 935,
  sunshineHours: 1969,
} as const;
