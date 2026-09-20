/**
 * Types domaine pour les stats agrégées par commune (phase 0 SEO programmatique).
 * Toutes les valeurs numériques sont des nombres bruts (pas de formatting).
 */

import type { City } from "@/lib/commune-slugs";
import type { SecurityAnalysis } from "@/server-modules/security/domain/security.types";
import type {
  EmploymentStats,
  HouseholdsStats,
  ScopedStats,
} from "@/server-modules/demographics/domain/insee-profile.types";

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
  /** Pondéré comme le revenu. Fraction (0,385 = 38,5 %), comme `partAges`. */
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
  /**
   * ratio vs la ville entière (1 = identique, >1 = au-dessus, <1 = en-dessous).
   * `null` quand `concentrationAnormale` : l'écart ne se calcule pas sur un nombre faussé.
   */
  ratioVsBenchmark: number | null;
  /**
   * Vrai quand l'arrondissement concentre plus de la moitié des équipements de sa ville dans
   * une catégorie du domaine — signe que la BPE les rattache à l'adresse de leur gestionnaire
   * plutôt qu'à leur lieu. Les 11 bibliothèques de Marseille sont ainsi toutes « dans » le 1er.
   */
  concentrationAnormale: boolean;
}

/**
 * Répartition annuelle des jours par catégorie de l'indice ATMO (Paris global).
 * Source : opendata.paris.fr — dataset "qualite-de-l-air-indice-atmo".
 */
export interface AirQualityAtmoYear {
  annee: number;
  joursBonne: number;
  joursMoyenne: number;
  joursDegradee: number;
  joursMauvaise: number;
  joursTresMauvaise: number;
  joursExtremementMauvaise: number;
  /** Somme des 6 catégories (généralement 365 ou 366). */
  totalJours: number;
}

export interface AirQualityStats {
  /** Historique trié par année DÉCROISSANTE (le plus récent en premier). */
  historique: AirQualityAtmoYear[];
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
  /** Candidats avec un écart >=5pp vs France (signe inclus, ordre voix décroissantes) */
  ecartsElectorauxNotables: Array<{
    candidat: string;
    parti: string;
    pctCommune: number;
    pctFrance: number;
    deltaPp: number;
  }>;
}

/**
 * Délinquance enregistrée (SSMSI) de l'arrondissement, et de sa ville entière comme repère.
 *
 * La ville remplace le département de la card d'analyse : pour Lyon et Marseille, le Rhône
 * et les Bouches-du-Rhône parlent moins qu'une comparaison à la ville, et pour Paris le
 * département est la ville. Les séries de `ville` sont réalignées sur `local.annees`.
 */
export interface SecurityStats {
  local: SecurityAnalysis;
  ville: SecurityAnalysis | null;
}

export interface CommuneStats {
  codeCommune: string;
  city: City;
  prix: PriceStats;
  prixBenchmarkVille: PriceStats; // benchmark de la ville (Paris/Lyon/Marseille) pour comparatif
  demo: DemographicsStats;
  demoFrance: DemographicsStats | null; // benchmark France pour la pyramide des âges
  /**
   * Emploi et ménages, bâtis par les constructeurs de la card d'analyse. L'arrondissement
   * occupe l'échelle `commune` comme en mode commune de l'analyse ; `iris` est toujours null.
   */
  employment: ScopedStats<EmploymentStats> | null;
  households: ScopedStats<HouseholdsStats> | null;
  equipements: EquipmentDomainStats[];
  airQuality: AirQualityStats | null;
  elections: ElectionsStats | null;
  /** `null` quand aucun indicateur n'est publié pour l'arrondissement. */
  securite: SecurityStats | null;
  highlights: CommuneHighlights;
}
