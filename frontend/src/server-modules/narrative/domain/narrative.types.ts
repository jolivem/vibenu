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
  } | null;
  cadastre: {
    urbanZoneType: string | null;
    urbanZoneLabel: string | null;
    parcelSurface: number | null;
  } | null;
}

export interface NarrativeDto {
  paragraph: string;
  generatedAt: string;
  cached: boolean;
  /** Données envoyées au LLM. Présent uniquement en mode debug (NEXT_PUBLIC_DEBUG=true). */
  debugInput?: NarrativeInput;
}
