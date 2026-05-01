/**
 * Compact subset of LocationAnalysisDto used as input for the narrative LLM.
 * We keep only the high-level signals the model needs to write a paragraph —
 * no coordinates, no technical IDs, no GeoJSON blobs.
 */
export interface NarrativeInput {
  addressLabel: string;
  mobility: {
    label: string;
    hasNearbyStation: boolean;
    nearestStationDistanceMeters: number | null;
    busStopsCount: number;
  };
  risks: {
    level: string;
    highlighted: Array<{ name: string; level: string }>;
  };
  airQuality: {
    level: string;
  };
  realEstate: {
    priceLevel: string | null;
    medianPricePerSquareMeter: number | null;
    nearbyTransactionsCount: number | null;
  } | null;
  neighborhood: {
    label: string;
    categoriesPresent: string[];
  };
  demographics: {
    nomCommune: string;
    population: number | null;
    revenuMedian: number | null;
    tauxPauvrete: number | null;
    /** Répartition par âge (% de chaque tranche) pour la zone analysée. */
    ageDistribution: {
      pct0_14: number;
      pct15_29: number;
      pct30_44: number;
      pct45_59: number;
      pct60_74: number;
      pct75Plus: number;
    } | null;
    /** Références nationales pour permettre les comparaisons. */
    national: {
      revenuMedian: number | null;
      tauxPauvrete: number | null;
      ageDistribution: {
        pct0_14: number;
        pct15_29: number;
        pct30_44: number;
        pct45_59: number;
        pct60_74: number;
        pct75Plus: number;
      } | null;
    } | null;
  } | null;
  cadastre: {
    urbanZoneType: string | null;
    urbanZoneLabel: string | null;
    parcelSurface: number | null;
  } | null;
  elections: {
    scrutin: string;
    participationPct: number;
    nationalParticipationPct: number;
    /** Top 3 candidats par score communal, avec écart au national. */
    topCandidats: Array<{
      candidat: string;
      parti: string;
      pctCommune: number;
      pctNational: number;
    }>;
  } | null;
  climate: {
    temperatureC: number;
    precipitationMm: number;
    sunshineHours: number;
    nationalTemperatureC: number;
    nationalPrecipitationMm: number;
    nationalSunshineHours: number;
  } | null;
}

export interface NarrativeDto {
  paragraph: string;
  generatedAt: string;
  cached: boolean;
  /** Données envoyées au LLM. Présent uniquement en mode debug (NEXT_PUBLIC_DEBUG=true). */
  debugInput?: NarrativeInput;
}
