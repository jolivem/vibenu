import type { SecurityIndicatorDto, SecurityTrancheDto } from "@/types/location-analysis";
import { createFormat } from "../../../format";
import type { Rich } from "../../../types";

const f = createFormat("fr");

const rate = (value: number) => `${f.decimal(value, 2)} ‰`;

/** Maille de la donnée : la commune, ou l'arrondissement à Paris, Lyon et Marseille. */
export type SecurityScale = "commune" | "arrondissement";

/**
 * Card « Sécurité » : délinquance enregistrée par la police et la gendarmerie (SSMSI).
 *
 * La donnée est sensible et facile à mal lire. Trois précautions sont portées par les
 * textes : la maille est annoncée (commune, pas quartier), la nature de la mesure est
 * rappelée (faits *enregistrés*), et les valeurs masquées par le secret statistique sont
 * dites pour ce qu'elles sont — 1 à 4 faits, pas une absence de donnée.
 */
export const security = {
  title: "Sécurité",
  rate,
  /** Infobulle d'un point de courbe. */
  pointTitle: (series: string, x: string, value: string) => `${series} — ${x} : ${value}`,
  /** Graduation de l'axe des ordonnées. */
  axisTick: (value: number) => f.number(value),
  /** Dénominateur du taux, selon l'indicateur. */
  base: {
    habitants: "pour 1 000 habitants",
    logements: "pour 1 000 logements",
  } satisfies Record<SecurityIndicatorDto["base"], string> as Record<SecurityIndicatorDto["base"], string>,
  unit: (base: string) => `faits enregistrés, ${base}`,
  /** Unité donnée au modèle de langage, plus courte que celle de la card. */
  insightUnit: (base: string) => `faits ${base}`,
  /**
   * Noms affichés des indicateurs, indexés par le libellé du SSMSI — qui sert de clé en
   * base et reste donc en français dans les données. Un indicateur absent d'ici s'affiche
   * sous son libellé source.
   */
  indicatorNames: {
    "Cambriolages de logement": "Cambriolages de logement",
    "Vols dans les véhicules": "Vols dans les véhicules",
    "Vols de véhicule": "Vols de véhicule",
    "Destructions et dégradations volontaires": "Destructions et dégradations volontaires",
    "Violences physiques hors cadre familial": "Violences physiques hors cadre familial",
  } as Record<string, string>,
  /** « Cet arrondissement », pas « Cette arrondissement » : le genre ne suit pas la variable. */
  localSeries: {
    commune: "Cette commune",
    arrondissement: "Cet arrondissement",
  } satisfies Record<SecurityScale, string> as Record<SecurityScale, string>,
  departmentSeries: "Département",
  franceSeries: "France",
  /**
   * Repère « communes de même taille », par tranche de population : nom de la courbe dans
   * la légende, puis forme pour la phrase de l'essentiel.
   */
  sizeSeries: {
    1: "Communes de moins de 2 000 hab.",
    2: "Communes de 2 000 à 10 000 hab.",
    3: "Communes de 10 000 à 50 000 hab.",
    4: "Villes de 50 000 à 200 000 hab.",
    5: "Villes de plus de 200 000 hab.",
  } satisfies Record<SecurityTrancheDto, string> as Record<SecurityTrancheDto, string>,
  sizeGroup: {
    1: "communes de moins de 2 000 habitants",
    2: "communes de 2 000 à 10 000 habitants",
    3: "communes de 10 000 à 50 000 habitants",
    4: "villes de 50 000 à 200 000 habitants",
    5: "villes de plus de 200 000 habitants",
  } satisfies Record<SecurityTrancheDto, string> as Record<SecurityTrancheDto, string>,
  /** Comment le repère est construit, en note sous les graphes. */
  sizeNote: (group: string, arrondissement: boolean) =>
    `Repère « même taille » : l'ensemble des ${group} de France${
      arrondissement ? ", l'arrondissement étant classé avec sa ville" : ""
    }, Paris, Lyon et Marseille comptées comme villes entières. Pour les communes dont le chiffre n'est pas publié, on retient la moyenne départementale fournie par le SSMSI.`,
  chartAria: (name: string, unit: string, from: number, to: number) => `${name}, ${unit}, de ${from} à ${to}`,
  /** Infobulle d'une bande d'incertitude. */
  bandTitle: (year: number, low: number, high: number) =>
    `${year} — entre 1 et 4 faits (${rate(low)} à ${rate(high)}), valeur masquée par le secret statistique`,
  /**
   * Surtout pas « entre 1 et 4 » comme libellé de légende : l'axe est gradué en ‰, pas en
   * nombre de faits. La conversion est donnée juste en dessous.
   */
  bandLegend: "Fourchette (valeur non publiée)",
  /**
   * Le graphe est gradué en ‰ alors que le secret statistique s'exprime en faits. Sans
   * cette phrase, une bande allant de 4 à 18 sur l'axe se lit à tort « 4 à 18 faits ».
   */
  conversion: (p: { maskedYears: number; totalYears: number; low: number; high: number }): Rich => [
    `Bande verte : ${
      p.maskedYears === p.totalYears
        ? "toutes les années"
        : `${p.maskedYears} année${p.maskedYears > 1 ? "s" : ""}`
    } où le chiffre exact n'est pas publié. Il s'agit d'`,
    { strong: "1 à 4 faits" },
    ` dans l'année, ce qui représente ici ${rate(p.low)} à ${rate(p.high)} — l'échelle du graphe étant en ‰, pas en nombre de faits.`,
  ],
  /** Mode « L'essentiel » : la dernière année seulement, une ligne par indicateur. */
  latest: {
    title: (year: number) => `Faits enregistrés en ${year}`,
    /** La valeur masquée est dite pour ce qu'elle est, pas laissée vide. */
    masked: "1 à 4 faits",
    /** Sous le titre : à quoi la valeur est comparée. Sans tranche connue, à la France. */
    comparedTo: (group: string | null) =>
      `Comparés au département et ${group ? `aux ${group}` : "à la France"}.`,
    references: (department: string | null, other: string | null, sameSize: boolean) =>
      [department && `dép. ${department}`, other && `${sameSize ? "même taille" : "France"} ${other}`]
        .filter(Boolean)
        .join(" · "),
  },
  noPublication:
    "Aucune année ne dépasse 4 faits pour les indicateurs suivis : les valeurs exactes ne sont pas publiées, seule leur fourchette est connue.",
  scopeNote: (p: { from: number; to: number; scale: SecurityScale; city?: string }) =>
    `Faits enregistrés par la police et la gendarmerie de ${p.from} à ${p.to}, à l'échelle de ${
      p.scale === "arrondissement" ? "l’arrondissement" : `la commune${p.city ? ` de ${p.city}` : ""}`
    }. Il n'existe pas de donnée publique à l'échelle du quartier.`,
  recordedNote: [
    "Il s'agit de faits ",
    { strong: "enregistrés" },
    " : la mesure dépend aussi de la propension à porter plainte et de la présence policière. Les effectifs de 1 à 4 ne sont pas publiés, pour ne pas permettre d'identifier les personnes concernées ; ils apparaissent ici en fourchette.",
  ] as Rich,
};

export type SecurityMessages = typeof security;
