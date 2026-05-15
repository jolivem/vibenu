export interface ClimateNormales {
  temperatureC: number | null;
  precipitationMm: number | null;
  sunshineHours: number | null;
  /** Identification de la station source (utile pour l'UI en mode adresse). */
  station?: {
    name: string;
    distanceKm: number;
  };
}

export interface ClimateProvider {
  /** Récupère les normales 1991-2020 pour un point. Retourne null si aucune source disponible. */
  getNormales(lat: number, lon: number): Promise<ClimateNormales | null>;
  /**
   * Normales France métropolitaine. Peut être hardcodé (valeurs officielles
   * Météo-France) ou calculé. Retourne null si la donnée n'est pas disponible.
   */
  getNationalNormales(): Promise<ClimateNormales | null>;
}
