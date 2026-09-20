import type { SecurityIndicatorDto } from "@/types/location-analysis";
import { BAND_HALF_WIDTH_RATIO, LINE_CHART_DIMENSIONS } from "./lineChart";
import type { LineChartBand, LineChartSeries } from "./LineChart";
import { LOCAL_SERIES_COLOR } from "./chartColors";

/**
 * Couleur de la série communale — la même que la série principale des graphes d'âge et
 * de climat, définie une fois dans `chartColors.ts`. « La courbe verte est celle qui
 * vous concerne » vaut pour toute la page.
 */
export { LOCAL_SERIES_COLOR };

/** Repères, dans les teintes désaturées déjà employées par le graphe climatique. */
const DEPARTEMENT_COLOR = "#7c8ba1";
const FRANCE_COLOR = "#b08968";

export function formatRate(n: number): string {
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ‰`;
}

/** Étiquette de l'axe et des infobulles, selon le dénominateur de l'indicateur. */
export function baseLabel(base: SecurityIndicatorDto["base"]): string {
  return base === "logements" ? "pour 1 000 logements" : "pour 1 000 habitants";
}

/**
 * Arrondissements de Paris, Lyon et Marseille : la commune INSEE y est l'arrondissement,
 * donc la maille de la donnée est bien celle d'un quartier — ce qui mérite d'être dit, à
 * l'inverse du reste du territoire.
 *
 * Vit ici plutôt que dans la card : la mini-synthèse IA a besoin de la même distinction
 * pour ne pas parler de « la commune » à propos d'un arrondissement.
 */
export function isArrondissement(codeInsee: string | undefined): boolean {
  if (!codeInsee) return false;
  return /^(751\d\d|132\d\d|6938\d)$/.test(codeInsee);
}

export interface SecurityChartModel {
  series: LineChartSeries[];
  bands: LineChartBand[];
  yTicks: number[];
  x: (i: number) => number;
  y: (v: number) => number;
  xLabels: string[];
  xTitles: string[];
}

/**
 * Construit le graphe d'un indicateur : la courbe communale, ses deux repères, et les
 * bandes d'incertitude des années masquées par le secret statistique.
 *
 * Ne rend jamais `null` : un indicateur sans aucune valeur publiée garde son graphe,
 * entièrement en bande. « Jamais plus de 4 faits par an ici » est une information, et
 * la masquer donnerait à tort l'impression d'une commune non documentée.
 */
/** Un repère tracé à côté de la série locale. */
export interface SecurityChartReference {
  name: string;
  values: (number | null)[];
}

export function buildSecurityChartModel(
  indicator: SecurityIndicatorDto,
  annees: number[],
  /**
   * Nom de la série locale — « Cette commune » ou « Cet arrondissement ».
   *
   * En paramètre et non en dur : la maille dépend du code INSEE, et le nom était
   * jusqu'ici figé à « Cette commune ». La légende de la card le corrigeait de son côté,
   * mais pas les infobulles du graphe, qui annonçaient donc « Cette commune » sur une
   * adresse parisienne. Un seul porteur du nom, désormais.
   */
  localName: string,
  /**
   * Repères, dans l'ordre de la légende. Par défaut le département et la France, ceux de la
   * card d'analyse ; les pages commune SEO passent la ville et la France. La France garde
   * son brun partout, tout autre repère prend le gris-bleu.
   */
  references: SecurityChartReference[] = [
    { name: "Département", values: indicator.departement },
    { name: "France", values: indicator.france },
  ],
): SecurityChartModel {
  const series: LineChartSeries[] = [
    {
      name: localName,
      color: LOCAL_SERIES_COLOR,
      strokeWidth: 2.8,
      dotRadius: 4,
      opacity: 1,
      values: indicator.commune,
    },
    ...references.map((reference) => ({
      name: reference.name,
      color: reference.name === "France" ? FRANCE_COLOR : DEPARTEMENT_COLOR,
      strokeWidth: 1.4,
      dotRadius: 2.5,
      opacity: 0.75,
      values: reference.values,
    })),
  ];

  const bands: LineChartBand[] = [];
  for (const [i] of annees.entries()) {
    const low = indicator.borneBasse[i];
    const high = indicator.borneHaute[i];
    if (low !== null && high !== null) bands.push({ index: i, low, high });
  }

  const values = [
    ...series.flatMap((s) => s.values),
    ...bands.map((b) => b.high),
  ].filter((v): v is number => v !== null);

  const rawMax = Math.max(...values, 1);
  const step = niceStep(rawMax);
  const maxY = Math.ceil(rawMax / step) * step;

  const { W, H, padL, padR, padT, padB } = LINE_CHART_DIMENSIONS;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  /*
   * Les bandes sont centrées sur leur année et débordent de part et d'autre. On réserve
   * donc une demi-bande à chaque extrémité, plutôt que de coller la première année sur
   * l'axe : sans cette marge, sa bande recouvre les graduations de l'ordonnée, et la
   * rogner la rendrait plus étroite que les autres.
   *
   * Le pas se déduit de la marge, et la marge du pas — d'où la résolution en une fois :
   * pas × (intervalles + 2 × ratio_de_marge) = largeur disponible.
   */
  const intervals = Math.max(annees.length - 1, 1);
  const insetRatio = BAND_HALF_WIDTH_RATIO / 2;
  const xStep = plotW / (intervals + 2 * insetRatio);
  const inset = xStep * insetRatio;

  // Les taux sont toujours positifs : l'axe part de zéro, seule origine honnête pour
  // comparer des ordres de grandeur.
  const x = (i: number) => padL + inset + i * xStep;
  const y = (v: number) => padT + plotH - (v / (maxY || 1)) * plotH;

  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round(((maxY * i) / 4) * 100) / 100);

  return {
    series,
    bands,
    yTicks,
    x,
    y,
    xLabels: yearLabels(annees),
    xTitles: annees.map(String),
  };
}

/**
 * Abscisses : l'année complète aux deux extrémités, deux chiffres entre les deux.
 *
 * « 2016 » répété dix fois se chevaucherait — d'où l'abrégé au départ. Mais une rangée
 * de « 16 17 18 … 25 » ne dit plus de quoi il s'agit : ce sont peut-être des âges, des
 * rangs, des numéros de département. Les deux bornes écrites en clair suffisent à
 * ancrer l'échelle, et le lecteur déduit le reste sans effort.
 *
 * La place existe aux extrémités et nulle part ailleurs : `BAND_HALF_WIDTH_RATIO`
 * réserve un retrait de part et d'autre du tracé, si bien que le premier et le dernier
 * point sont les seuls à n'avoir de voisin que d'un côté.
 *
 * Une seule année → elle est écrite en entier, l'abréger n'économiserait rien.
 */
function yearLabels(annees: number[]): string[] {
  return annees.map((annee, i) =>
    i === 0 || i === annees.length - 1 ? String(annee) : String(annee).slice(2),
  );
}

/** Pas d'axe lisible : 1, 2, 5, 10… selon l'amplitude, pour 4 graduations. */
function niceStep(max: number): number {
  const target = (max || 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalized = target / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}
