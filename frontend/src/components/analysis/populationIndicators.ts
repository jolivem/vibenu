import type {
  AggregateStatsDto,
  DemographicsAnalysisDto,
  EmploymentStatsDto,
  HouseholdsStatsDto,
  HousingStatsDto,
  ScopedStatsDto,
} from "@/types/location-analysis";
import { absoluteComparison, ratioComparison, type Indicator } from "./indicator";
import { formatDensity, formatPct, formatRevenu } from "./demographicsFormat";
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
    title: "Densité",
    unit: "habitants au km²",
    pick: (s) => s.density,
    format: formatDensity,
    // En rapport et non en écart : « 479 fois la moyenne française » se lit, « 50 615
    // hab./km² de plus » ne dit rien à l'œil.
    comparison: ratioComparison(formatDensity),
  },
  {
    key: "revenu",
    title: "Revenu médian",
    unit: "revenu disponible médian par unité de consommation",
    pick: (s) => s.revenuMedian,
    format: formatRevenu,
    comparison: absoluteComparison(formatRevenu),
  },
  {
    key: "pauvrete",
    title: "Taux de pauvreté",
    unit: "part de la population sous le seuil de 60 % du niveau de vie médian",
    pick: (s) => s.tauxPauvrete,
    format: formatPct,
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
    title: "Taux de chômage",
    unit: "en % des actifs de 15-64 ans",
    pick: (s) => s.tauxChomage,
    format: formatPct,
  },
  {
    key: "activite",
    title: "Taux d'activité",
    unit: "en % des 15-64 ans",
    pick: (s) => s.tauxActivite,
    format: formatPct,
  },
  {
    key: "diplomes",
    title: "Diplômés du supérieur",
    unit: "en % des 15 ans et plus non scolarisés",
    pick: (s) => s.pctDiplomesSuperieur,
    format: formatPct,
  },
];

/** « 1,81 pers. » — deux décimales, comme les publications INSEE sur la taille des ménages. */
function formatPersonnes(value: number): string {
  return `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pers.`;
}

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
    title: "Taille moyenne des ménages",
    unit: "personnes par ménage",
    pick: (s) => s.tailleMoyenne,
    format: formatPersonnes,
    // Une taille de ménage s'écarte en personnes, pas en points de pourcentage.
    comparison: absoluteComparison(formatPersonnes),
  },
  {
    key: "seules",
    title: "Personnes seules",
    unit: "en % des ménages",
    pick: (s) => s.pctPersonnesSeules,
    format: formatPct,
  },
  {
    key: "monoparentales",
    title: "Familles monoparentales",
    unit: "en % des ménages",
    pick: (s) => s.pctFamillesMonoparentales,
    format: formatPct,
  },
];

/** Du foyer d'une personne à la famille nombreuse ; le reste est hachuré. */
const [ALONE, COUPLE, FAMILY, SINGLE_PARENT] = STACK_COLORS;

export function compositionSegments(s: HouseholdsStatsDto): StackedBarSegment[] {
  return [
    { label: "Personne seule", color: ALONE, value: s.pctPersonnesSeules },
    { label: "Couple sans enfant", color: COUPLE, value: s.pctCouplesSansEnfant },
    { label: "Couple avec enfants", color: FAMILY, value: s.pctCouplesAvecEnfants },
    { label: "Famille monoparentale", color: SINGLE_PARENT, value: s.pctFamillesMonoparentales },
    { label: "Autres ménages", value: s.pctAutresMenages, residual: true },
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
    title: "Logements vacants",
    unit: "en % du parc total",
    pick: (s) => s.pctVacants,
    format: formatPct,
  },
  {
    key: "secondaires",
    title: "Résidences secondaires",
    unit: "en % du parc total",
    pick: (s) => s.pctResidencesSecondaires,
    format: formatPct,
  },
];

const [OWNER, PRIVATE_RENT, SOCIAL_RENT, FREE] = STACK_COLORS;
const [HOUSE, FLAT] = STACK_COLORS;

export function occupancySegments(s: HousingStatsDto): StackedBarSegment[] {
  return [
    { label: "Propriétaires", color: OWNER, value: s.pctProprietaires },
    { label: "Locataires du privé", color: PRIVATE_RENT, value: s.pctLocatairesPrives },
    { label: "Locataires HLM", color: SOCIAL_RENT, value: s.pctHlm },
    { label: "Logés gratuitement", color: FREE, value: s.pctLogesGratuitement },
  ];
}

export function dwellingSegments(s: HousingStatsDto): StackedBarSegment[] {
  return [
    { label: "Maisons", color: HOUSE, value: s.pctMaisons },
    { label: "Appartements", color: FLAT, value: s.pctAppartements },
  ];
}
