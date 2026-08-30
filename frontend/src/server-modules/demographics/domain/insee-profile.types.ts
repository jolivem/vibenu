/**
 * Profil INSEE d'un quartier : logement, emploi & qualifications, ménages.
 *
 * Trois axes du recensement 2021, tous à la maille IRIS et tous issus de la même
 * requête que la démographie — ils sont regroupés ici parce qu'ils partagent la même
 * structure (une mesure, trois échelles) et les mêmes précautions de lecture.
 *
 * Toutes les valeurs `pct*` sont des pourcentages de 0 à 100, arrondis au dixième.
 * `null` signifie « la source ne renseigne pas cette valeur à cette échelle », jamais
 * « zéro » : un IRIS sans résidence principale n'a pas 0 % de propriétaires, il n'a
 * pas de taux du tout.
 */

/**
 * Une mesure aux trois échelles de la rubrique Population.
 *
 * `iris` est le quartier consulté, `commune` et `france` ses repères. Ces deux
 * derniers sont pré-agrégés en base (vue `insee_aggregate`) comme des rapports de
 * sommes, jamais comme des moyennes de taux.
 */
export interface ScopedStats<T> {
  iris: T | null;
  commune: T | null;
  france: T | null;
}

export interface HousingStats {
  /** Parc total de logements, toutes catégories. */
  logements: number | null;
  /** Résidences principales : dénominateur du statut d'occupation et des pièces. */
  residencesPrincipales: number | null;
  pctProprietaires: number | null;
  /**
   * Locataires du parc privé. Le fichier INSEE compte les HLM *dans* les locataires
   * (`RP_LOCHLMV` ⊂ `RP_LOC`) ; on retire donc le parc social pour que les quatre
   * parts du statut d'occupation forment bien une partition.
   */
  pctLocatairesPrives: number | null;
  pctHlm: number | null;
  pctLogesGratuitement: number | null;
  /** Rapportés au parc total, pas aux résidences principales. */
  pctVacants: number | null;
  pctResidencesSecondaires: number | null;
  /** Maisons et appartements ne bouclent pas à 100 % : il reste les « autres logements ». */
  pctMaisons: number | null;
  pctAppartements: number | null;
  /** 1, 2, 3, 4, 5 pièces et plus. Dénominateur : résidences principales. */
  pieces: (number | null)[] | null;
  /**
   * Avant 1919, 1919-45, 1946-70, 1971-90, 1991-2005, 2006-18. Dénominateur :
   * les résidences principales construites avant 2019, et non le parc entier —
   * d'où une part qui ne dit rien des logements les plus récents.
   */
  epoques: (number | null)[] | null;
}

export interface EmploymentStats {
  /**
   * Chômeurs rapportés aux actifs de 15-64 ans, au sens du recensement : c'est une
   * déclaration des personnes interrogées, pas le taux BIT publié chaque trimestre.
   * Il est structurellement plus élevé de 1 à 2 points. L'écran doit le dire.
   */
  tauxChomage: number | null;
  /** Actifs rapportés à la population de 15-64 ans. */
  tauxActivite: number | null;
  /**
   * Répartition des actifs *occupés* par catégorie socioprofessionnelle, dans
   * l'ordre de la nomenclature INSEE (CS1 à CS6). Les actifs occupés plutôt que les
   * actifs : la CSP d'un chômeur est celle de son dernier emploi.
   */
  csp: (number | null)[] | null;
  /** Bac+2 et plus, parmi les non-scolarisés de 15 ans ou plus. */
  pctDiplomesSuperieur: number | null;
  /** Sans diplôme, BEPC, CAP-BEP, Bac, Bac+2, Bac+3/4, Bac+5 et plus. */
  diplomes: (number | null)[] | null;
}

export interface HouseholdsStats {
  nombreMenages: number | null;
  /** Personnes des ménages rapportées au nombre de ménages. */
  tailleMoyenne: number | null;
  pctPersonnesSeules: number | null;
  pctCouplesSansEnfant: number | null;
  pctCouplesAvecEnfants: number | null;
  pctFamillesMonoparentales: number | null;
  /** Ménages sans famille, hors personnes seules. Complète la partition à 100 %. */
  pctAutresMenages: number | null;
  /** Familles par nombre d'enfants de moins de 25 ans : 0, 1, 2, 3, 4 et plus. */
  enfantsParFamille: (number | null)[] | null;
}

export interface InseeProfile {
  housing: ScopedStats<HousingStats> | null;
  employment: ScopedStats<EmploymentStats> | null;
  households: ScopedStats<HouseholdsStats> | null;
}
