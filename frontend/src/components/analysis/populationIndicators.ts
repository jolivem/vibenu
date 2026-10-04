import type {
  AggregateStatsDto,
  DemographicsAnalysisDto,
  EmploymentStatsDto,
  HouseholdsStatsDto,
  HousingStatsDto,
  ScopedStatsDto,
} from "@/types/location-analysis";
import type { PopulationMessages } from "@/i18n/messages/fr/analysis/population";
import type { Indicator } from "./indicator";
import { STACK_COLORS } from "./inseeChart";
import type { StackedBarSegment } from "./StackedBar";

/**
 * Les indicateurs et les barres empilées des quatre cards Population, partagés avec le
 * PDF pour que les deux disent les mêmes chiffres dans les mêmes termes.
 */

/**
 * Densité, revenus et pauvreté.
 *
 * La population totale n'y figure plus : elle ne se compare pas — les 67 millions
 * d'habitants de la France ne sont pas un repère pour un quartier de 2 000 — et
 * `PopulationScope` nomme déjà la zone en tête de section, pour les quatre cards.
 */
export const DEMOGRAPHICS_INDICATORS: Array<Indicator<AggregateStatsDto>> = [
  {
    key: "densite",
    pick: (s) => s.density,
    format: "density",
    // En rapport et non en écart : « 479 fois la moyenne française » se lit, « 50 615
    // hab./km² de plus » ne dit rien à l'œil.
    comparison: "ratio",
  },
  {
    key: "revenu",
    pick: (s) => s.revenuMedian,
    format: "revenu",
    comparison: "absolute",
  },
  {
    key: "pauvrete",
    pick: (s) => s.tauxPauvrete,
    format: "pct",
  },
];

/**
 * Les champs du quartier sont à plat sur le DTO, là où les trois autres axes de la
 * rubrique suivent `{ iris, commune, france }` — irrégularité documentée dans
 * `DemographicsAnalysisDto`. On la replie ici pour réutiliser `viewForMode`.
 */
export function demographicsScoped(demographics: DemographicsAnalysisDto): ScopedStatsDto<AggregateStatsDto> {
  return {
    iris: {
      population: demographics.population,
      density: demographics.density,
      ageDistribution: demographics.ageDistribution,
      revenuMedian: demographics.revenuMedian,
      tauxPauvrete: demographics.tauxPauvrete,
    },
    commune: demographics.communeStats,
    france: demographics.nationalStats,
  };
}

/**
 * Les trois taux de la card Emploi, chacun dans son propre bloc titré — même gabarit que
 * les deux graphes qui les suivent. Cf. `IndicatorBlock` pour le motif.
 */
export const EMPLOYMENT_INDICATORS: Array<Indicator<EmploymentStatsDto>> = [
  {
    key: "chomage",
    pick: (s) => s.tauxChomage,
    format: "pct",
  },
  {
    key: "activite",
    pick: (s) => s.tauxActivite,
    format: "pct",
  },
  {
    key: "diplomes",
    pick: (s) => s.pctDiplomesSuperieur,
    format: "pct",
  },
];

/**
 * Les trois mesures scalaires de la card Ménages, chacune dans son bloc titré.
 *
 * Le nombre de ménages n'y figure plus : c'est un effectif, qui ne se compare pas — les
 * 30 millions de ménages français ne sont pas un repère pour un quartier — et qui ne
 * disait rien de la composition, seul sujet de la card.
 */
export const HOUSEHOLDS_INDICATORS: Array<Indicator<HouseholdsStatsDto>> = [
  {
    key: "taille",
    pick: (s) => s.tailleMoyenne,
    format: "persons",
    // Une taille de ménage s'écarte en personnes, pas en points de pourcentage.
    comparison: "absolute",
  },
  {
    key: "seules",
    pick: (s) => s.pctPersonnesSeules,
    format: "pct",
  },
  {
    key: "monoparentales",
    pick: (s) => s.pctFamillesMonoparentales,
    format: "pct",
  },
];

/** Du foyer d'une personne à la famille nombreuse ; le reste est hachuré. */
const [ALONE, COUPLE, FAMILY, SINGLE_PARENT] = STACK_COLORS;

export function compositionSegments(s: HouseholdsStatsDto, m: PopulationMessages): StackedBarSegment[] {
  return [
    { label: m.segments.alone, color: ALONE, value: s.pctPersonnesSeules },
    { label: m.segments.coupleNoChild, color: COUPLE, value: s.pctCouplesSansEnfant },
    { label: m.segments.coupleWithChildren, color: FAMILY, value: s.pctCouplesAvecEnfants },
    { label: m.segments.singleParent, color: SINGLE_PARENT, value: s.pctFamillesMonoparentales },
    { label: m.segments.otherHouseholds, value: s.pctAutresMenages, residual: true },
  ];
}

/**
 * Les deux taux scalaires de la card Logement, chacun dans son bloc titré.
 *
 * Le nombre de logements et celui des résidences principales n'y figurent plus : deux
 * effectifs, qui ne se comparent pas à un total national, et dont le second ne servait
 * que de dénominateur — il est désormais nommé dans la ligne d'unité des blocs qui
 * l'utilisent.
 */
export const HOUSING_INDICATORS: Array<Indicator<HousingStatsDto>> = [
  {
    key: "vacants",
    pick: (s) => s.pctVacants,
    format: "pct",
  },
  {
    key: "secondaires",
    pick: (s) => s.pctResidencesSecondaires,
    format: "pct",
  },
];

const [OWNER, PRIVATE_RENT, SOCIAL_RENT, FREE] = STACK_COLORS;
const [HOUSE, FLAT] = STACK_COLORS;

export function occupancySegments(s: HousingStatsDto, m: PopulationMessages): StackedBarSegment[] {
  return [
    { label: m.segments.owners, color: OWNER, value: s.pctProprietaires },
    { label: m.segments.privateTenants, color: PRIVATE_RENT, value: s.pctLocatairesPrives },
    { label: m.segments.socialTenants, color: SOCIAL_RENT, value: s.pctHlm },
    { label: m.segments.freeOfCharge, color: FREE, value: s.pctLogesGratuitement },
  ];
}

export function dwellingSegments(s: HousingStatsDto, m: PopulationMessages): StackedBarSegment[] {
  return [
    { label: m.segments.houses, color: HOUSE, value: s.pctMaisons },
    { label: m.segments.flats, color: FLAT, value: s.pctAppartements },
  ];
}
