import { formatFr } from "@/lib/format";

export function formatPopulation(value: number | null): string {
  if (value == null) return "—";
  return `${formatFr(Math.round(value))} hab.`;
}

export function formatDensity(value: number | null): string {
  if (value == null) return "—";
  return `${formatFr(value)} hab./km²`;
}

export function formatRevenu(value: number | null): string {
  if (value == null) return "—";
  return `${formatFr(Math.round(value))} €/an`;
}

export function formatPct(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)} %`;
}
