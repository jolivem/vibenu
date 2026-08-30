import { LINE_CHART_DIMENSIONS } from "./lineChart";
import type { LineChartSeries } from "./LineChart";
import type { AnalysisMode, DemographicsAnalysisDto, ScopedStatsDto } from "@/types/location-analysis";

/**
 * Modèles des graphes de répartition de la rubrique Population.
 *
 * Quatre graphes ont exactement la même forme — nombre de pièces, époque de
 * construction, catégories socioprofessionnelles, niveau de diplôme : une catégorie
 * ordonnée en abscisse, un pourcentage en ordonnée, et les trois échelles en séries.
 * Un seul constructeur les sert donc tous ; chaque card n'apporte que ses libellés.
 *
 * Le rendu passe par le `LineChart` générique, comme le profil climatique et la
 * délinquance. `AgeChart` reste à part : il est antérieur et porte son propre rendu.
 */

/** Le violet est « le lieu que vous consultez », dans toute la page. */
export const LOCAL_COLOR = "#8b5cf6";
const COMMUNE_COLOR = "#a78060";
const FRANCE_COLOR = "#6b7280";

/**
 * Palette des barres empilées — les catégories d'une partition.
 *
 * Volontairement disjointe des trois couleurs de séries ci-dessus : dans une courbe,
 * la couleur désigne une *échelle* (violet = le lieu consulté) ; dans une barre
 * empilée, elle désigne une *catégorie*, et les échelles sont les lignes. Réutiliser
 * le violet ferait cohabiter deux significations à quelques pixels d'écart.
 *
 * Quatre teintes, assignées dans un ordre fixe et jamais recyclées, validées pour les
 * trois formes de daltonisme et pour le contraste sur fond de card (écart minimal
 * ΔE 11,3 en vision déficiente, 15,5 en vision normale).
 *
 * Un cinquième segment n'obtient pas une cinquième couleur : les résidus (« autres
 * ménages ») sortent de l'espace chromatique et passent par une texture — aucun gris
 * ne se sépare proprement du teal, et un reste n'est de toute façon pas une catégorie
 * comme les autres.
 */
export const STACK_COLORS = ["#1d4ed8", "#0d9488", "#ea580c", "#be123c"] as const;

export interface InseeView<T> {
  scoped: ScopedStatsDto<T>;
  /** En-tête de la colonne principale : « Quartier », ou le nom de la commune. */
  localName: string;
  communeName: string;
  showCommune: boolean;
}

/**
 * Adapte une mesure aux trois échelles au mode d'analyse en cours.
 *
 * En mode commune, l'IRIS retourné est celui du centroïde : le présenter comme « le
 * quartier » d'une recherche qui portait sur une ville entière serait faux. La commune
 * devient donc la série principale, comparée à la seule France — c'est ce que fait
 * déjà la card Démographie, en dur, dans sa branche `isCommune`.
 *
 * En mode adresse, la colonne communale s'efface quand la commune n'a qu'un IRIS :
 * elle répéterait le quartier à l'identique.
 */
export function viewForMode<T>(
  scoped: ScopedStatsDto<T> | null | undefined,
  mode: AnalysisMode,
  demographics: Pick<DemographicsAnalysisDto, "nomCommune" | "communeIrisCount">,
): InseeView<T> | null {
  if (!scoped) return null;
  const communeName = demographics.nomCommune || "Commune";

  if (mode === "commune") {
    if (!scoped.commune) return null;
    return {
      scoped: { iris: scoped.commune, commune: null, france: scoped.france },
      localName: communeName,
      communeName,
      showCommune: false,
    };
  }

  if (!scoped.iris) return null;
  return {
    scoped,
    localName: "Quartier",
    communeName,
    showCommune: demographics.communeIrisCount > 1 && scoped.commune !== null,
  };
}

export interface DistributionModel {
  series: LineChartSeries[];
  yTicks: number[];
  x: (i: number) => number;
  y: (v: number) => number;
}

export function formatPercent(n: number): string {
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

/** Les échelles d'un graphe de parts : ordonnée toujours ancrée à zéro. */
function buildScales(maxValue: number, pointCount: number) {
  const { W, H, padL, padR, padT, padB } = LINE_CHART_DIMENSIONS;

  // Multiple de 10 au-dessus du maximum observé, minimum 10 : deux graphes voisins
  // gardent des graduations rondes, et une part de 3 % ne remplit pas la hauteur.
  const maxY = Math.max(10, Math.ceil(maxValue / 10) * 10);
  const step = maxY / 5;
  const yTicks = Array.from({ length: 6 }, (_, i) => Math.round(i * step));

  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const x = (i: number) => padL + (pointCount > 1 ? (i / (pointCount - 1)) * plotW : plotW / 2);
  const y = (v: number) => padT + plotH - (v / maxY) * plotH;

  return { yTicks, x, y };
}

/**
 * Construit un graphe de répartition à partir d'une mesure aux trois échelles.
 *
 * Rend `null` si le quartier n'a pas la distribution : sans la série principale, le
 * graphe ne comparerait que deux repères, ce qui n'apprend rien sur l'adresse.
 * La commune est masquée quand elle se confond avec le quartier (commune à IRIS
 * unique), pour ne pas dessiner deux fois la même courbe.
 */
export function buildDistributionModel<T>({
  scoped,
  pick,
  communeName,
  showCommune,
  localName,
}: InseeView<T> & {
  pick: (stats: T) => (number | null)[] | null;
}): DistributionModel | null {
  const local = scoped?.iris ? pick(scoped.iris) : null;
  if (!local || local.length === 0) return null;

  const commune = showCommune && scoped?.commune ? pick(scoped.commune) : null;
  const france = scoped?.france ? pick(scoped.france) : null;

  const series: LineChartSeries[] = [
    { name: localName, color: LOCAL_COLOR, strokeWidth: 2.8, dotRadius: 4, opacity: 1, values: local },
  ];
  if (commune) {
    series.push({
      name: communeName,
      color: COMMUNE_COLOR,
      strokeWidth: 1.6,
      dotRadius: 3,
      opacity: 0.9,
      values: commune,
    });
  }
  if (france) {
    series.push({
      name: "France",
      color: FRANCE_COLOR,
      strokeWidth: 1.4,
      dotRadius: 2.5,
      opacity: 0.85,
      values: france,
    });
  }

  const maxValue = Math.max(
    0,
    ...series.flatMap((s) => s.values.filter((v): v is number => v !== null)),
  );
  return { series, ...buildScales(maxValue, local.length) };
}
