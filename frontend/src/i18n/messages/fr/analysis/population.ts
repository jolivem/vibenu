import { createFormat } from "../../../format";
import type { Rich } from "../../../types";

const f = createFormat("fr");

/**
 * Comparaison d'un indicateur au repère national, déjà calculée : le message n'a plus
 * qu'à la dire. `gap` et `ref` sont des valeurs formatées avec leur unité.
 */
export type IndicatorComparison =
  | { kind: "same"; ref: string }
  | { kind: "gap"; gap: string; more: boolean; ref: string }
  | { kind: "ratio"; times: number; more: boolean; ref: string }
  /** Repère national nul : aucun rapport ne se calcule. */
  | { kind: "versus"; ref: string };

/** « 1,5 point », « 2,4 points » — en français, le singulier tient jusqu'à deux exclus. */
function points(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${f.decimal(rounded, 1)} ${f.plural(rounded) === "one" ? "point" : "points"}`;
}

function comparisonClause(c: IndicatorComparison): string {
  switch (c.kind) {
    case "same":
      return ` au même niveau qu'en France (${c.ref})`;
    case "gap":
      return ` soit ${c.gap} ${c.more ? "de plus" : "de moins"} qu'en France (${c.ref})`;
    case "ratio":
      return ` soit ${f.decimal(c.times, 1)} fois${c.more ? "" : " moins"} la moyenne française (${c.ref})`;
    case "versus":
      return ` contre ${c.ref} en France`;
  }
}

/**
 * Rubrique « Population » : les quatre cards INSEE (démographie, emploi, ménages,
 * logement), leur en-tête de zone et les phrases de comparaison de leurs indicateurs.
 * Partagé par l'écran, la fiche PDF et les pages commune.
 */
export const population = {
  format: {
    /** Une décimale, toujours : « 17,9 % » dans la courbe et dans la phrase voisine. */
    pct: (value: number) => `${f.decimal(value, 1, 1)} %`,
    /** Infobulles des graphes : la décimale seulement si elle existe. */
    percent: (value: number) => `${f.decimal(value, 1)} %`,
    density: (value: number) => `${f.spaced(value)} hab./km²`,
    revenu: (value: number) => `${f.spaced(Math.round(value))} €/an`,
    /** Deux décimales, comme les publications INSEE sur la taille des ménages. */
    persons: (value: number) => `${f.decimal(value, 2, 2)} pers.`,
  },
  /** Infobulle d'un point de courbe. */
  pointTitle: (series: string, x: string, value: string) => `${series} — ${x} : ${value}`,
  /** Graduation de l'axe des ordonnées. */
  axisTick: (value: number) => f.number(value),
  /** Noms des trois échelles, en tête de colonne et en légende. */
  scale: {
    neighbourhood: "Quartier",
    commune: "Commune",
    france: "France",
  },
  points,
  /**
   * « **12 %** ici, soit 3 points de plus qu'en France (9 %), et 10 % à Lyon. »
   * « ici » plutôt que « dans ce quartier » : le même mot vaut pour une adresse et pour
   * une commune, comme dans le prompt des mini-synthèses.
   */
  sentence: (parts: {
    value: string;
    comparison: IndicatorComparison | null;
    commune: { value: string; name: string } | null;
  }): Rich => [
    { strong: parts.value },
    ` ici${parts.comparison ? `,${comparisonClause(parts.comparison)}` : ""}${
      parts.commune ? `, et ${parts.commune.value} à ${parts.commune.name}` : ""
    }.`,
  ],
  /** Version resserrée, pour la fiche PDF : « Revenu médian 38 960 €/an (France 23 323 €/an) ». */
  compact: (title: string, local: string, france: string | null) =>
    `${title} ${local}${france !== null ? ` (France ${france})` : ""}`,
  /**
   * Titre et dénominateur de chaque indicateur. L'unité se lit là où elle sert, plutôt
   * qu'en note de bas de card : deux taux d'une même card n'ont pas forcément la même
   * population de référence.
   */
  indicators: {
    densite: { title: "Densité", unit: "habitants au km²" },
    revenu: { title: "Revenu médian", unit: "revenu disponible médian par unité de consommation" },
    pauvrete: {
      title: "Taux de pauvreté",
      unit: "part de la population sous le seuil de 60 % du niveau de vie médian",
    },
    chomage: { title: "Taux de chômage", unit: "en % des actifs de 15-64 ans" },
    activite: { title: "Taux d'activité", unit: "en % des 15-64 ans" },
    diplomes: { title: "Diplômés du supérieur", unit: "en % des 15 ans et plus non scolarisés" },
    taille: { title: "Taille moyenne des ménages", unit: "personnes par ménage" },
    seules: { title: "Personnes seules", unit: "en % des ménages" },
    monoparentales: { title: "Familles monoparentales", unit: "en % des ménages" },
    vacants: { title: "Logements vacants", unit: "en % du parc total" },
    secondaires: { title: "Résidences secondaires", unit: "en % du parc total" },
  },
  /** Segments des barres empilées. */
  segments: {
    alone: "Personne seule",
    coupleNoChild: "Couple sans enfant",
    coupleWithChildren: "Couple avec enfants",
    singleParent: "Famille monoparentale",
    otherHouseholds: "Autres ménages",
    owners: "Propriétaires",
    privateTenants: "Locataires du privé",
    socialTenants: "Locataires HLM",
    freeOfCharge: "Logés gratuitement",
    houses: "Maisons",
    flats: "Appartements",
  },
  /** Barre empilée : résumé lu par les lecteurs d'écran, et infobulle d'un segment. */
  barSummary: (row: string, segments: string[]) => `${row} : ${segments.join(", ")}`,
  segmentTitle: (label: string, value: string) => `${label} — ${value}`,
  demographics: {
    title: "Démographie",
    ageTitle: "Répartition par âge",
    ageUnit: "en % de la population",
    ageAria: "Répartition par âge — comparaison multi-séries",
    agePoint: (series: string, bucket: string, value: number) => `${series} — ${bucket} : ${value}%`,
    footnote: (commune: boolean) =>
      `${
        commune
          ? "Moyennes pondérées par population, agrégées à partir des quartiers IRIS de la commune."
          : "Commune et France : moyennes pondérées par population, calculées à partir des quartiers."
      } Le revenu médian et le taux de pauvreté ne sont publiés que pour les quartiers assez peuplés, plutôt urbains : ils manquent souvent à l'échelle du quartier, et le repère France s'en trouve un peu plus élevé que le taux national.`,
  },
  employment: {
    title: "Emploi et qualifications",
    cspTitle: "Catégories socioprofessionnelles",
    cspUnit: "en % des actifs occupés",
    cspLabels: ["Agri.", "Artis.", "Cadres", "Interm.", "Employés", "Ouvriers"],
    cspTitles: [
      "Agriculteurs exploitants",
      "Artisans, commerçants, chefs d'entreprise",
      "Cadres et professions intellectuelles supérieures",
      "Professions intermédiaires",
      "Employés",
      "Ouvriers",
    ],
    cspNote:
      "Les actifs occupés seuls : la catégorie d'un chômeur est celle de son dernier emploi, elle redirait ce que dit déjà le taux de chômage.",
    diplomaTitle: "Niveau de diplôme",
    diplomaUnit: "en % des 15 ans et plus non scolarisés",
    diplomaLabels: ["Aucun", "BEPC", "CAP-BEP", "Bac", "+2", "+3/4", "+5"],
    diplomaTitles: [
      "Sans diplôme ou certificat d'études primaires",
      "BEPC, brevet des collèges",
      "CAP ou BEP",
      "Baccalauréat",
      "Bac + 2",
      "Bac + 3 ou + 4",
      "Bac + 5 ou plus",
    ],
    /**
     * Le chômage du recensement n'est pas le chômage au sens du BIT : un chiffre présenté
     * sans sa définition se compare de travers.
     */
    footnote: [
      "Le taux de chômage du recensement 2021 est ",
      { strong: "déclaratif" },
      " : il compte les personnes qui se déclarent au chômage, et non celles que le Bureau international du travail recense comme telles. Il est structurellement d'un à deux points au-dessus du taux publié chaque trimestre, et ne s'y compare pas.",
    ] as Rich,
  },
  households: {
    title: "Ménages et familles",
    compositionTitle: "Composition des ménages",
    compositionUnit: "en % des ménages",
    childrenTitle: "Enfants par famille",
    childrenUnit: "en % des familles, enfants de moins de 25 ans",
    childrenLabels: ["Aucun", "1", "2", "3", "4 et +"],
    footnote:
      "La composition des foyers, recensée en 2021. Un ménage est l'ensemble des personnes d'un même logement, qu'elles aient ou non un lien de parenté.",
  },
  housing: {
    title: "Logement",
    occupancyTitle: "Statut d'occupation",
    occupancyUnit: "en % des résidences principales",
    dwellingTitle: "Type de logement",
    dwellingUnit: "en % du parc total",
    dwellingNote:
      "Les deux parts ne bouclent pas toujours à 100 % : l'INSEE compte à part les logements qui ne sont ni maison ni appartement.",
    roomsTitle: "Nombre de pièces",
    roomsUnit: "en % des résidences principales",
    roomLabels: ["1 p.", "2 p.", "3 p.", "4 p.", "5 p. et +"],
    epochTitle: "Époque de construction",
    epochUnit: "en % des résidences principales achevées avant 2019",
    epochLabels: ["<1919", "19-45", "46-70", "71-90", "91-05", "06-18"],
    epochTitles: ["Avant 1919", "1919-1945", "1946-1970", "1971-1990", "1991-2005", "2006-2018"],
    epochNote:
      "L'INSEE ne ventile par période que les logements achevés avant 2019 : les plus récents ne figurent dans aucune tranche.",
    footnote:
      "Le parc de logements, recensé en 2021. Les effectifs du recensement sont des estimations pondérées, arrondies à l'unité : sur un petit quartier, les parts peuvent ne pas boucler exactement à 100 %.",
  },
  /** En-tête de zone de la section, en mode adresse. */
  scope: {
    kicker: "Quartier :",
    text: (withMap: boolean) =>
      `Données du quartier IRIS, zone statistique d'environ 2 000 habitants${withMap ? ", délimitée sur la carte." : "."}`,
    singleIris:
      "Quartier unique pour cette commune — les chiffres du quartier et de la commune sont identiques.",
    mapAria: (name: string) => `Limites du quartier ${name}`,
  },
};

export type PopulationMessages = typeof population;
export type IndicatorKey = keyof PopulationMessages["indicators"];
export type IndicatorFormat = keyof PopulationMessages["format"];
