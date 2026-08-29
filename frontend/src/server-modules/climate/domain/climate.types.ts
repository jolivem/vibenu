/**
 * Profil sur 12 mois d'une station, index 0 = janvier.
 *
 * Une valeur est `null` quand la station ne mesure pas cette grandeur — cas courant
 * pour l'ensoleillement, mesuré par une station sur dix seulement.
 */
export interface ClimateMonthlySeries {
  /** Nom affiché en légende : « Cette adresse », « Strasbourg »… */
  name: string;
  /** Type de climat, pour les villes de référence. Absent pour la série locale. */
  climateType?: string;
  /** Station réellement utilisée, quand elle mérite d'être nommée. */
  stationName?: string;
  temperatureC: (number | null)[];
  precipitationMm: (number | null)[];
  sunshineHours: (number | null)[];
}

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
  /**
   * Profil mensuel local et villes de référence. Absent si aucune donnée mensuelle
   * n'est disponible pour les stations retenues.
   */
  monthly?: {
    local: ClimateMonthlySeries;
    references: ClimateMonthlySeries[];
  } | null;
  /**
   * Station utilisée par mesure, avec sa distance. Les trois peuvent différer : le
   * rayon de recherche est de 30 km pour la température et les précipitations, mais
   * de 100 km pour l'ensoleillement, faute d'héliographes.
   */
  stationsByMetric?: {
    temperature?: { name: string; distanceKm: number };
    precipitation?: { name: string; distanceKm: number };
    sunshine?: { name: string; distanceKm: number };
  };
}
