import type {
  AnnualPollutantCode,
  AnnualReferenceKind,
  AnnualUnit,
  StationArea,
} from "@/types/location-analysis";
import type { AirTrend, ChartThresholdKind } from "@/components/analysis/airQualityModel";
import { createFormat } from "../../../format";

const f = createFormat("fr");

const areas: Record<StationArea, string> = {
  urban: "fond urbain",
  suburban: "fond périurbain",
  rural: "fond rural",
};

const value = (v: number, unit: AnnualUnit) =>
  unit === "days" ? `${f.decimal(v, 1)} jours/an` : `${f.decimal(v, 1)} µg/m³`;

/**
 * `ratio` = valeur / seuil, arrondi au dixième. Pour la cible UE de l'ozone (des jours), un
 * « 1,4 × » se lirait mal : on dit seulement de quel côté du seuil on se trouve.
 */
const referenceLine = (kind: AnnualReferenceKind, ratio: number) => {
  if (kind === "euTarget") {
    return ratio < 1
      ? "sous la valeur cible européenne"
      : ratio === 1
        ? "au niveau de la valeur cible européenne"
        : "au-dessus de la valeur cible européenne";
  }
  return ratio < 1
    ? "sous la valeur guide de l'OMS"
    : ratio === 1
      ? "au niveau de la valeur guide de l'OMS"
      : `${f.decimal(ratio, 1)} × la valeur guide de l'OMS`;
};

const shortPollutants: Record<AnnualPollutantCode, string> = {
  no2: "NO₂",
  pm25: "PM2,5",
  pm10: "PM10",
  o3: "O₃",
};

const thresholdNames: Record<ChartThresholdKind, string> = {
  who: "Guide OMS",
  euLimit: "Limite UE",
  euTarget: "Cible UE",
};

/** « −35 % » / « +12 % » : le signe toujours écrit, pour la France entre parenthèses. */
const signedPercent = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${f.int(Math.abs(n))} %`;

/** Card « Qualité de l'air » : indicateurs annuels des stations de mesure les plus proches. */
export const air = {
  title: "Qualité de l'air",
  /** En tête du bloc : la mesure vaut pour le secteur, pas pour le logement. */
  annualCaveat: "Mesures de la station la plus proche : indicatives pour le secteur, pas pour l'adresse exacte.",
  /** Nom court, en tête de chaque ligne. */
  annualPollutants: {
    no2: "Dioxyde d'azote (NO₂)",
    pm25: "Particules fines PM2,5",
    pm10: "Particules PM10",
    o3: "Ozone (O₃) — jours de pic",
  } satisfies Record<AnnualPollutantCode, string>,
  value,
  referenceLine,
  areas,
  /** Précède le nom de la station, affiché tel quel. */
  stationLead: "Station ",
  ruralStationLead: "Station rurale de référence ",
  /** Suit le nom de la station : « (fond urbain) ». */
  stationArea: (area: StationArea) => ` (${areas[area]})`,
  /** Mise en avant dans la ligne : c'est elle qui dit si la mesure vaut pour l'adresse. */
  stationDistance: (km: number) => `à ${f.decimal(km, 1)} km`,
  stationYear: (year: number) => `mesures ${year}`,
  trendSeries: { national: "Moyenne France" },
  thresholdNames,
  /** Terme en tête de son explication ; l'espace insécable avant « : » est française. */
  thresholdTerm: (name: string) => `${name}\u00a0:`,
  /** Ce que vaut chaque seuil, sous la liste — seulement pour ceux tracés sur la card. */
  thresholdNotes: {
    who: "valeur maximum recommandée par l'Organisation mondiale de la santé.",
    euLimit: "valeur maximale fixée par la directive européenne de 2024.",
    euTarget: "objectif européen maximal à atteindre dans la mesure du possible.",
  } satisfies Record<ChartThresholdKind, string>,
  axisTick: (v: number) => f.number(v),
  pointTitle: (series: string, x: string, v: string) => `${series} — ${x} : ${v}`,
  chartAria: (pollutant: string, from: number, to: number) =>
    `${pollutant} : station la plus proche et moyenne France, de ${from} à ${to}`,
  /** Ajouté à la note quand une station rurale de référence remplace une station proche. */
  ruralFallbackNote:
    "Aucune station à moins de 20 km : la valeur est celle de la station rurale la plus proche, " +
    "implantée loin de toute source pour représenter la campagne alentour. Elle ne tient pas " +
    "compte d'une route ou d'une activité proche de l'adresse.",
  /** Libellés recopiés par le modèle dans « En bref » : donnés dans la langue de sortie. */
  insightPollutants: {
    no2: "dioxyde d'azote (NO₂)",
    pm25: "particules fines PM2,5",
    pm10: "particules PM10",
    o3: "ozone",
  } satisfies Record<AnnualPollutantCode, string>,
  insightDaysUnit: "jours de dépassement par an",
  insightRuralSource: (km: number) => `mesures d'une station rurale à ${km} km, faute de station plus proche`,
  insightWhoGuideline: "valeur guide OMS",
  insightEuTarget: "valeur cible européenne",
  /** Fiche PDF. */
  pdfAnnual: (
    code: AnnualPollutantCode,
    v: number,
    unit: AnnualUnit,
    kind: AnnualReferenceKind,
    ratio: number,
    trend: AirTrend | null,
  ) =>
    `${shortPollutants[code]} ${value(v, unit)} (${referenceLine(kind, ratio)}` +
    (trend ? `, ${signedPercent(trend.change)} depuis ${trend.from})` : ")"),
};

export type AirMessages = typeof air;
