/**
 * Normales climatiques 1991-2020 pour un point géographique,
 * comparées aux normales nationales France métropolitaine.
 */
export interface ClimateAnalysis {
  periodStart: number; // 1991
  periodEnd: number;   // 2020
  /** Température annuelle moyenne (°C). */
  temperatureC: number | null;
  /** Cumul annuel moyen de précipitations (mm). */
  precipitationMm: number | null;
  /** Cumul annuel moyen d'ensoleillement (heures). NULL si station héliographe trop éloignée. */
  sunshineHours: number | null;
  /** Normales France métropolitaine (référence Météo-France). */
  national: {
    temperatureC: number;
    precipitationMm: number;
    sunshineHours: number;
  };
  /** Station Météo-France de référence utilisée pour ces valeurs. */
  station?: {
    name: string;
    distanceKm: number;
  };
}
