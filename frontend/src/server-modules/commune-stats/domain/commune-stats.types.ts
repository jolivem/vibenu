/**
 * Types domaine pour les stats agrégées par commune (phase 0 SEO programmatique).
 * Toutes les valeurs numériques sont des nombres bruts (pas de formatting).
 */

export interface PriceStats {
  prixM2Median: number | null;
  p25: number | null;
  p75: number | null;
  nbTransactions: number;
  /** Médiane par année [{annee, prixMedian}], pour courbe d'évolution */
  evolution: Array<{ annee: number; prixMedian: number; nbTransactions: number }>;
}

export interface DemographicsStats {
  populationTotale: number;
  /** Parts d'âge en fraction (0..1), pas en pourcentage */
  partAges: {
    part_0_14: number;
    part_15_29: number;
    part_30_44: number;
    part_45_59: number;
    part_60_74: number;
    part_75_plus: number;
  };
  /** Médiane pondérée des médianes IRIS — approximation honnête */
  revenuMedianPondere: number | null;
  /** Idem */
  tauxPauvretePondere: number | null;
}

export type EquipmentDomain =
  | "alimentaire"
  | "restauration"
  | "sante"
  | "education"
  | "culture"
  | "sport_loisirs"
  | "services_publics"
  | "transports";

export interface EquipmentDomainStats {
  domain: EquipmentDomain;
  label: string;
  nb: number;
  /** Densité pour 1000 habitants */
  densite1000hab: number;
  /** ratio vs Paris global (1 = identique, >1 = au-dessus, <1 = en-dessous) */
  ratioVsBenchmark: number | null;
}

export interface AirQualityStats {
  annee: number | null;
  polluants: Array<{
    code: string; // "PM25", "PM10", "NO2", "O3"
    label: string;
    concentration: number;
    seuilOms: number | null;
    /** ratio concentration / seuilOms (>1 = au-dessus du seuil OMS) */
    ratioOms: number | null;
  }>;
}

export interface ElectionCandidateResult {
  candidat: string;
  parti: string;
  panneau: number;
  voix: number;
  pctExprimes: number;
  /** % exprimés au niveau France (référentiel) */
  pctExprimesFrance: number | null;
  /** delta en points de pourcentage (commune − France) */
  deltaPp: number | null;
}

export interface ElectionsStats {
  scrutin: string; // "Présidentielle 2022 — 1er tour"
  inscrits: number;
  votants: number;
  exprimes: number;
  /** Taux de participation (votants/inscrits), fraction 0..1 */
  tauxParticipation: number;
  tauxParticipationFrance: number | null;
  /** Top candidats triés par voix décroissantes */
  candidats: ElectionCandidateResult[];
  /** Référentiels France pour affichage */
  totalInscritsFrance: number | null;
}

export interface CommuneHighlights {
  /** Profil dominant déduit de la pyramide des âges (ex: "30-44 ans") */
  profilAgeDominant: string | null;
  /** Domaines BPE significativement au-dessus de Paris (ratio >= 1.5) */
  surperformances: EquipmentDomain[];
  /** Domaines significativement en-dessous (ratio <= 0.5) */
  sousrepresentations: EquipmentDomain[];
  /** Polluants au-dessus du seuil OMS */
  pollutionCritique: string[];
  /** Candidats avec un écart >=5pp vs France (signe inclus, ordre voix décroissantes) */
  ecartsElectorauxNotables: Array<{
    candidat: string;
    parti: string;
    pctCommune: number;
    pctFrance: number;
    deltaPp: number;
  }>;
}

export interface CommuneStats {
  codeCommune: string;
  prix: PriceStats;
  prixBenchmarkParis: PriceStats; // benchmark Paris global pour comparatif
  demo: DemographicsStats;
  demoFrance: DemographicsStats | null; // benchmark France pour la pyramide des âges
  equipements: EquipmentDomainStats[];
  airQuality: AirQualityStats | null;
  elections: ElectionsStats | null;
  highlights: CommuneHighlights;
}
