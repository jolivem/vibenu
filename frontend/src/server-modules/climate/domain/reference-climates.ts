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
  { stationId: "17300001", name: "La Rochelle", climateType: "océanique" },
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
