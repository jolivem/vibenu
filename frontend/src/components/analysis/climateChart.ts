import type { ClimateMonthlySeriesDto } from "@/types/location-analysis";
import { LINE_CHART_DIMENSIONS } from "./lineChart";
import { LOCAL_SERIES_COLOR } from "./chartColors";

export const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

/** Nom complet, pour les infobulles — « M » et « J » sont ambigus à eux seuls. */
export const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
] as const;

/** Géométrie partagée avec le graphe de répartition par âge — voir lineChart.ts. */
export const CLIMATE_CHART_DIMENSIONS = LINE_CHART_DIMENSIONS;

/** Les trois mesures affichables, avec la couleur de la série locale. */
export type ClimateMetric = "temperatureC" | "precipitationMm" | "sunshineHours";

export const CLIMATE_METRICS: ReadonlyArray<{
  key: ClimateMetric;
  label: string;
  unit: string;
  format: (n: number) => string;
}> = [
  {
    key: "temperatureC",
    label: "Température",
    unit: "°C",
    format: (n) => `${n.toFixed(1).replace(".", ",")} °C`,
  },
  {
    key: "precipitationMm",
    label: "Précipitations",
    unit: "mm",
    format: (n) => `${Math.round(n)} mm`,
  },
  {
    key: "sunshineHours",
    label: "Ensoleillement",
    unit: "h",
    format: (n) => `${Math.round(n)} h`,
  },
];

/**
 * Couleur de la série locale, **la même sur les trois graphes**.
 *
 * Dans un graphe multi-séries la couleur encode l'identité de la série, rien d'autre.
 * Lui faire porter en plus la mesure — rouge pour la température, bleu pour la pluie —
 * obligeait à une pastille de légende en dégradé, signe que l'encodage était faux : la
 * mesure est déjà nommée par le titre du graphe.
 *
 * C'est la couleur de la série principale de tous les graphes de la page
 * (`chartColors.ts`) : « la courbe verte est celle qui me concerne » vaut partout.
 */
export { LOCAL_SERIES_COLOR };

/**
 * Teintes des villes de référence, **fixes d'un graphe à l'autre** : la légende
 * s'apprend une fois et vaut pour les trois graphes. Volontairement désaturées, pour
 * rester des repères et ne pas concurrencer la série locale.
 *
 * Chaque teinte dit le climat qu'elle représente, ce qui donne une légende qu'on n'a
 * presque pas besoin de lire : bleu pour le continental de Strasbourg, rouge pour le
 * méditerranéen de Marseille, gris pour l'océanique tempéré de La Rochelle.
 *
 * ⚠️ Le rouge et le vert de la série locale se ressemblent en vision deutéranope. Ce
 * qui les sépare tient au tracé bien plus qu'à la teinte : la série locale est deux fois
 * plus épaisse (2,8 contre 1,4), à pleine opacité contre 0,75, avec des points deux fois
 * plus larges. La clarté ajoute une marge — le rouge est à L* 61, le vert à 54,5.
 *
 * Cette marge disparaît entre L* 52 et 57, où le rouge aurait exactement la clarté du
 * vert : c'est la zone à ne pas viser en ajustant la teinte. Sous ~50 ou au-dessus de
 * ~59, l'écart est rétabli. Et ne pas uniformiser les épaisseurs de trait « pour faire
 * propre » sans reprendre les couleurs : c'est là que se joue l'essentiel.
 */
export const REFERENCE_COLORS: Record<string, string> = {
  Strasbourg: "#3F6EA3",
  Marseille: "#CB7F76",
  "La Rochelle": "#6B7280",
};

/**
 * Pour une ville de référence hors de la table — cas qui ne se produit qu'après un ajout
 * dans `REFERENCE_CLIMATES`. Volontairement plus clair que le gris de La Rochelle, pour
 * qu'un oubli se voie au lieu de passer pour elle.
 */
const FALLBACK_REFERENCE_COLOR = "#9CA3AF";

export interface ClimateChartSeries {
  name: string;
  climateType?: string;
  color: string;
  strokeWidth: number;
  dotRadius: number;
  opacity: number;
  /** 12 valeurs, index 0 = janvier. `null` = pas de mesure ce mois-là. */
  values: (number | null)[];
}

export interface ClimateChartModel {
  series: ClimateChartSeries[];
  yTicks: number[];
  x: (i: number) => number;
  y: (v: number) => number;
}

/**
 * Construit le modèle d'un graphe pour une mesure donnée.
 *
 * Retourne `null` quand la série locale n'a aucune valeur : sans elle le graphe ne
 * parlerait plus de l'adresse consultée, seulement de trois villes — la card masque
 * alors la mesure entière. En pratique c'est l'ensoleillement qui manque, faute
 * d'héliographe dans les 100 km.
 */
export function buildClimateChartModel(params: {
  metric: ClimateMetric;
  local: ClimateMonthlySeriesDto;
  references: ClimateMonthlySeriesDto[];
}): ClimateChartModel | null {
  const { metric, local, references } = params;

  const localValues = local[metric];
  if (!localValues.some((v) => v !== null)) return null;

  const series: ClimateChartSeries[] = [
    {
      name: local.name,
      color: LOCAL_SERIES_COLOR,
      strokeWidth: 2.8,
      dotRadius: 4,
      opacity: 1,
      values: localValues,
    },
  ];

  for (const ref of references) {
    const values = ref[metric];
    if (!values.some((v) => v !== null)) continue;
    series.push({
      name: ref.name,
      climateType: ref.climateType,
      color: REFERENCE_COLORS[ref.name] ?? FALLBACK_REFERENCE_COLOR,
      strokeWidth: 1.4,
      dotRadius: 2.5,
      opacity: 0.75,
      values,
    });
  }

  const allValues = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  const rawMax = Math.max(...allValues, 1);
  // La température passe sous zéro en climat continental : l'axe doit suivre.
  const rawMin = Math.min(...allValues, 0);

  const step = niceStep(rawMax - rawMin);
  const maxY = Math.ceil(rawMax / step) * step;
  const minY = Math.floor(rawMin / step) * step;

  const { W, H, padL, padR, padT, padB } = CLIMATE_CHART_DIMENSIONS;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const x = (i: number) => padL + (i * plotW) / (MONTH_LABELS.length - 1);
  const y = (v: number) => padT + plotH - ((v - minY) / (maxY - minY || 1)) * plotH;

  const yTicks: number[] = [];
  for (let t = minY; t <= maxY + 1e-9; t += step) yTicks.push(Math.round(t * 10) / 10);

  return { series, yTicks, x, y };
}

/** Pas d'axe lisible : 1, 2, 5, 10, 20, 50… selon l'amplitude, pour ~4 graduations. */
function niceStep(range: number): number {
  const target = (range || 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalized = target / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}
