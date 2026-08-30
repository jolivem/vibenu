/**
 * Compact subset of LocationAnalysisDto used as input for the narrative LLM.
 * We keep only the high-level signals the model needs to write a paragraph —
 * no coordinates, no technical IDs, no GeoJSON blobs.
 */
export interface NarrativeInput {
  /** "address" = adresse précise, "commune" = recherche commune (centroïde). */
  mode: "address" | "commune";
  addressLabel: string;
  mobility: {
    label: string;
    /** En mode commune, ces champs sont mis à null car calculés depuis le centroïde (sans sens). */
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
  /**
   * Profil INSEE du quartier, chaque indicateur accompagné de sa référence nationale.
   *
   * Volontairement court : douze nombres, pas les distributions complètes. Un modèle
   * à qui l'on donne trente pourcentages en récite la liste, alors que le paragraphe
   * attendu est qualitatif — « parc surtout locatif, plus récent que la moyenne ». Les
   * ventilations restent lisibles dans les graphes de la page.
   */
  inseeProfile: {
    housing: {
      pctProprietaires: number | null;
      pctHlm: number | null;
      pctVacants: number | null;
      pctResidencesSecondaires: number | null;
      pctMaisons: number | null;
      national: {
        pctProprietaires: number | null;
        pctHlm: number | null;
        pctVacants: number | null;
        pctResidencesSecondaires: number | null;
        pctMaisons: number | null;
      } | null;
    } | null;
    employment: {
      tauxChomage: number | null;
      pctCadres: number | null;
      pctOuvriers: number | null;
      pctDiplomesSuperieur: number | null;
      national: {
        tauxChomage: number | null;
        pctCadres: number | null;
        pctOuvriers: number | null;
        pctDiplomesSuperieur: number | null;
      } | null;
    } | null;
    households: {
      tailleMoyenne: number | null;
      pctPersonnesSeules: number | null;
      pctFamillesMonoparentales: number | null;
      national: {
        tailleMoyenne: number | null;
        pctPersonnesSeules: number | null;
        pctFamillesMonoparentales: number | null;
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
    temperatureC: number | null;
    precipitationMm: number | null;
    sunshineHours: number | null;
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
