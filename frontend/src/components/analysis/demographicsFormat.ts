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
  // Séparateur décimal français : les infobulles des graphes voisins passent par
  // toLocaleString, et un « 1.5 % » dans le tableau à côté d'un « 17,9 % » dans la
  // courbe se lit comme deux unités différentes.
  return `${value.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}
