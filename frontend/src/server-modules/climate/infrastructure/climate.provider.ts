export interface ClimateNormales {
  temperatureC: number;
  precipitationMm: number;
  sunshineHours: number;
}

export interface ClimateProvider {
  /** Récupère les normales 1991-2020 pour un point. Retourne null en cas d'erreur. */
  getNormales(lat: number, lon: number): Promise<ClimateNormales | null>;
}
