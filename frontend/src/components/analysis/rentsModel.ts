import type { RentAnalysisDto, RentAreaFeatureDto, RentIndicatorDto, RentTypeDto } from "@/types/location-analysis";

/** Partagé par `RentsCard`, la tuile de chiffres clés et la fiche PDF. Des faits, aucun texte. */

/** La card n'existe que si la commune a au moins un loyer publié. */
export function hasRentContent(rents: RentAnalysisDto | null | undefined): rents is RentAnalysisDto {
  return Boolean(rents && rents.indicateurs.length > 0);
}

export function rentOf(rents: RentAnalysisDto, type: RentTypeDto): RentIndicatorDto | null {
  return rents.indicateurs.find((i) => i.type === type) ?? null;
}

/** Écart relatif à un repère, en % arrondi à l'unité ; `null` sans repère. */
export function rentDeltaPct(value: number, reference: number | undefined): number | null {
  if (!reference) return null;
  return Math.round(((value - reference) / reference) * 100);
}

export interface RentExample {
  pieces: number;
  surface: number;
  /** €/mois, arrondi à la dizaine : la précision du loyer au m² ne permet pas mieux. */
  monthly: number;
  /** Bornes de l'intervalle à 95 % du loyer au m², appliquées à la même surface. */
  low: number | null;
  high: number | null;
}

/**
 * Trois logements types, chacun au loyer de sa taille : un studio de 20 m² et un 2 pièces de
 * 45 m² au loyer des 1-2 pièces, un 4 pièces de 80 m² au loyer des 3 pièces et plus. Un
 * exemple est omis si son loyer manque.
 */
const EXAMPLES: Array<{ pieces: number; surface: number; type: RentTypeDto }> = [
  { pieces: 1, surface: 20, type: "app12" },
  { pieces: 2, surface: 45, type: "app12" },
  { pieces: 4, surface: 80, type: "app3" },
];

const toMonthly = (perM2: number, surface: number) => Math.round((perM2 * surface) / 10) * 10;

export function rentExamples(rents: RentAnalysisDto): RentExample[] {
  return EXAMPLES.flatMap(({ pieces, surface, type }) => {
    const rent = rentOf(rents, type);
    if (!rent) return [];
    return [{
      pieces,
      surface,
      monthly: toMonthly(rent.loyerM2, surface),
      low: rent.icBas !== null ? toMonthly(rent.icBas, surface) : null,
      high: rent.icHaut !== null ? toMonthly(rent.icHaut, surface) : null,
    }];
  });
}

// --- Carte des communes alentour ---------------------------------------------

/**
 * Quatre teintes du vert du site (`--accent`, #4B9319, en troisième position) : plus c'est
 * foncé, plus c'est cher — une gamme continue, sans code d'alerte.
 */
export const RENT_CLASS_COLORS = ["#e3f0d0", "#a9d17a", "#4b9319", "#2c5a0e"];

export interface RentClass {
  /** Bornes de la classe, `null` aux deux extrémités. */
  low: number | null;
  high: number | null;
  color: string;
}

/** Arrondi au demi-euro : des bornes à 18,37 €/m² n'apprennent rien de plus que 18,5. */
const roundHalf = (v: number) => Math.round(v * 2) / 2;

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const next = sorted[base + 1] ?? sorted[base];
  return sorted[base] + (next - sorted[base]) * (pos - base);
}

/**
 * Classes calculées sur les communes affichées (quartiles), et non sur la France : une échelle
 * nationale (8 à 32 €/m²) peindrait d'une seule teinte les 17,7 à 24,3 €/m² autour de
 * Saint-Cyr-l'École. Des bornes égales après arrondi sont fusionnées.
 */
export function rentClasses(areas: RentAreaFeatureDto[]): RentClass[] {
  const values = areas.map((a) => a.properties.loyerM2).sort((a, b) => a - b);
  if (values.length === 0) return [];
  const breaks = [...new Set([0.25, 0.5, 0.75].map((q) => roundHalf(quantile(values, q))))].filter(
    (b) => b > values[0] && b <= values[values.length - 1],
  );
  const bounds = [null, ...breaks, null] as Array<number | null>;
  return bounds.slice(0, -1).map((low, i) => ({
    low,
    high: bounds[i + 1],
    // Moins de classes que de teintes : on prend les plus contrastées, en gardant les extrêmes.
    color: RENT_CLASS_COLORS[Math.round((i * (RENT_CLASS_COLORS.length - 1)) / Math.max(bounds.length - 2, 1))],
  }));
}

function classOf(value: number, classes: RentClass[]): RentClass {
  return classes.find((c) => c.high === null || value < c.high) ?? classes[classes.length - 1];
}

/** Communes prêtes pour la carte : la couleur de leur classe portée en propriété `fill`. */
export type RentMapFeature = RentAreaFeatureDto & {
  properties: RentAreaFeatureDto["properties"] & { fill: string };
};

/**
 * Mémoïsé sur l'identité du tableau, sans hook : `Map` reconstruit la carte quand l'identité
 * de ses données change (cf. `NO_TRANSPORTS`), et la card doit rester rendable hors React client.
 */
const coloredCache = new WeakMap<RentAreaFeatureDto[], RentMapFeature[]>();

export function rentMapFeatures(areas: RentAreaFeatureDto[], classes: RentClass[]): RentMapFeature[] {
  const cached = coloredCache.get(areas);
  if (cached) return cached;
  const colored = areas.map((a) => ({
    ...a,
    properties: { ...a.properties, fill: classOf(a.properties.loyerM2, classes).color },
  }));
  coloredCache.set(areas, colored);
  return colored;
}
