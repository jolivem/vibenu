/**
 * Helpers de formatage pour les pages /commune/[slug].
 * Locale FR par défaut.
 */

const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const intFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

const decimalFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatEur(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return eurFormatter.format(value);
}

export function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return intFormatter.format(value);
}

export function formatPct(fraction: number | null | undefined, decimals = 0): string {
  if (fraction === null || fraction === undefined || !Number.isFinite(fraction)) return "—";
  const pct = fraction * 100;
  if (decimals === 0) return `${Math.round(pct)} %`;
  return `${pct.toFixed(decimals).replace(".", ",")} %`;
}

export function formatDecimal(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return decimalFormatter.format(value);
}

/**
 * Densité d'équipements pour 10 000 habitants, à partir d'une densité pour 1 000.
 *
 * Pour 1 000 et à une décimale, les équipements rares s'arrondissaient à « 0,0 » — suivis
 * d'un « +84 % vs Marseille » qui contredisait le zéro. Pour 10 000, avec deux décimales
 * sous 1 et une sous 10 : « 0,26 », « 6,4 », « 185 ». Même unité que la card de l'analyse.
 */
export function formatDensityPer10k(per1000: number | null | undefined): string {
  if (per1000 === null || per1000 === undefined || !Number.isFinite(per1000)) return "—";
  const value = per1000 * 10;
  const digits = value < 1 ? 2 : value < 10 ? 1 : 0;
  return value.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatDelta(delta: number | null | undefined, decimals = 1): string {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) return "—";
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(decimals).replace(".", ",")} %`;
}

/**
 * Compute % delta between value and reference (e.g. arrondissement vs Paris).
 */
export function pctDelta(value: number | null, reference: number | null): number | null {
  if (!value || !reference || reference === 0) return null;
  return ((value - reference) / reference) * 100;
}
