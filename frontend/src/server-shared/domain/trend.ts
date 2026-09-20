/**
 * Écarts et tendances, tranchés en TypeScript sur des seuils explicites.
 *
 * Partagés par les « En bref » de l'analyse et par les pages commune SEO : un même taux de
 * cambriolages ne doit pas être « stable » sur l'une et « en baisse » sur l'autre.
 */

/** Sens d'une évolution, tranché en TS sur un seuil relatif. */
export type Tendance = "en baisse" | "stable" | "en hausse";

/** Au-delà de ce seuil relatif, une évolution sur 10 ans cesse d'être « stable ». */
export const TENDANCE_THRESHOLD_PCT = 10;

export function round(n: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function roundOrNull(n: number | null | undefined, decimals = 1): number | null {
  return n === null || n === undefined || !Number.isFinite(n) ? null : round(n, decimals);
}

/** Écart relatif en pourcentage — pour les grandeurs qui ne sont pas des parts. */
export function ecartPct(local: number | null | undefined, reference: number | null | undefined): number | null {
  if (local === null || local === undefined || reference === null || reference === undefined) return null;
  if (reference === 0) return null;
  return round(((local - reference) / reference) * 100);
}

/** À partir de ce multiple du repère, un écart se dit « N fois » : « +1 262,8 % » ne se lit pas. */
export const MULTIPLE_MIN = 2;

/**
 * Écart relatif sous la forme qu'un lecteur comprend : un pourcentage tant que la valeur
 * reste sous le double du repère, un multiple au-delà (« 13,6 fois »). Au plus un des deux
 * champs est renseigné.
 */
export interface EcartRelatif {
  pct: number | null;
  multiple: number | null;
}

export function ecartRelatif(local: number | null | undefined, reference: number | null | undefined): EcartRelatif {
  const pct = ecartPct(local, reference);
  if (pct === null) return { pct: null, multiple: null };
  const multiple = round((local as number) / (reference as number));
  return multiple >= MULTIPLE_MIN ? { pct: null, multiple } : { pct, multiple: null };
}

export function firstNumber(values: (number | null)[]): number | null {
  return values.find((v): v is number => v !== null) ?? null;
}

export function lastNumber(values: (number | null)[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (v !== null) return v;
  }
  return null;
}

/** Le sens d'une évolution relative, `null` quand elle n'a pas pu être calculée. */
export function tendance(evolutionPct: number | null): Tendance | null {
  if (evolutionPct === null) return null;
  if (evolutionPct > TENDANCE_THRESHOLD_PCT) return "en hausse";
  if (evolutionPct < -TENDANCE_THRESHOLD_PCT) return "en baisse";
  return "stable";
}
