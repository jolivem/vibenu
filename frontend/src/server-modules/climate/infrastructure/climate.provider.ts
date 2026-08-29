import type { ClimateMonthlySeries } from "../domain/climate.types";

export interface ClimateNormales {
  temperatureC: number | null;
  precipitationMm: number | null;
  sunshineHours: number | null;
  /** Identification de la station source (utile pour l'UI en mode adresse). */
  station?: {
    name: string;
    distanceKm: number;
  };
  /** Station retenue pour chaque mesure — elles peuvent différer (rayons distincts). */
  stationsByMetric?: {
    temperature?: { name: string; distanceKm: number };
    precipitation?: { name: string; distanceKm: number };
    sunshine?: { name: string; distanceKm: number };
  };
  /** Profil sur 12 mois : la série locale et les villes de référence. */
  monthly?: {
    local: ClimateMonthlySeries;
    references: ClimateMonthlySeries[];
  } | null;
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
