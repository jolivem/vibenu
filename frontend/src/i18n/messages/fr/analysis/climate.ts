import type { ClimateMetric } from "@/components/analysis/climateChart";
import { createFormat } from "../../../format";

const f = createFormat("fr");

/** « l'océanique », « le continental » : l'article s'élide devant une voyelle. */
function withArticle(type: string): string {
  return /^[aeiouyàâäéèêëîïôöùûü]/i.test(type) ? `l'${type}` : `le ${type}`;
}

/**
 * Card « Climat » : normales mensuelles Météo-France, comparées à trois villes
 * représentatives des grands climats français. Il n'y a pas de « moyenne France »
 * pertinente pour un climat : le repère est un type, pas une moyenne.
 */
export const climate = {
  title: (from: number, to: number) => `Climat (normales ${from}–${to})`,
  /** Nom de la série locale dans les graphes de l'analyse. */
  localSeries: "Cette adresse",
  metrics: {
    temperatureC: { label: "Température", unit: "moyenne mensuelle, en °C" },
    precipitationMm: { label: "Précipitations", unit: "cumul mensuel, en mm" },
    sunshineHours: { label: "Ensoleillement", unit: "cumul mensuel, en heures" },
  } satisfies Record<ClimateMetric, { label: string; unit: string }>,
  format: {
    temperatureC: (value: number) => `${f.fixed(value, 1)} °C`,
    precipitationMm: (value: number) => `${Math.round(value)} mm`,
    sunshineHours: (value: number) => `${Math.round(value)} h`,
  } satisfies Record<ClimateMetric, (value: number) => string>,
  /** Infobulle d'un point de courbe. */
  pointTitle: (series: string, x: string, value: string) => `${series} — ${x} : ${value}`,
  /** Graduation de l'axe des ordonnées. */
  axisTick: (value: number) => f.number(value),
  /** Abscisse des graphes : initiales des mois, puis noms complets pour les infobulles. */
  monthInitials: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  monthNames: [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ],
  chartAria: (label: string) => `${label} mois par mois — comparaison avec trois climats types`,
  /**
   * Types de climat des villes de référence. La clé est la valeur portée par les données
   * (en français) ; un type absent d'ici s'affiche tel quel.
   */
  climateTypes: {
    continental: "continental",
    méditerranéen: "méditerranéen",
    océanique: "océanique",
  } as Record<string, string>,
  /**
   * « Profil mois par mois, comparé à des villes représentatives des grands climats
   * français : Strasbourg pour le climat continental, Marseille pour le méditerranéen… »
   */
  referencesNote: (references: ReadonlyArray<{ name: string; climateType: string }>) => {
    const head =
      "Profil mois par mois, comparé à des villes représentatives des grands climats français";
    if (references.length === 0) return `${head}.`;
    const list = references
      .map(({ name, climateType }, i) => {
        const type = climate.climateTypes[climateType] ?? climateType;
        return i === 0 ? `${name} pour le climat ${type}` : `${name} pour ${withArticle(type)}`;
      })
      .join(", ");
    return `${head} : ${list}.`;
  },
  /** « Température : Lyon-Bron (4,2 km) » — une station par mesure. */
  stationLine: (metric: ClimateMetric, name: string, distanceKm: number) =>
    `${climate.metrics[metric].label} : ${name} (${f.decimal(distanceKm, 1)} km)`,
  stationsNote: (lines: string[]) => `Stations de mesure les plus proches — ${lines.join(" · ")}.`,
  referenceStationsNote: (pairs: ReadonlyArray<{ station: string; city: string }>) =>
    `Villes de référence mesurées à ${pairs.map((p) => `${p.station} pour ${p.city}`).join(", ")}.`,
  /** Fiche PDF : « Température 12,3 °C (France 13,1 °C) ». */
  pdfMeasure: (label: string, value: string, france: string) => `${label} ${value} (France ${france})`,
  pdfFormat: {
    temperatureC: (value: number) => `${f.fixed(value, 1)} °C`,
    precipitationMm: (value: number) => `${f.int(value)} mm`,
    sunshineHours: (value: number) => `${f.int(value)} h`,
  } satisfies Record<ClimateMetric, (value: number) => string>,
};

export type ClimateMessages = typeof climate;
