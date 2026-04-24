export function formatPopulation(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value).toLocaleString("fr-FR")} hab.`;
}

export function formatDensity(value: number | null): string {
  if (value == null) return "—";
  return `${value.toLocaleString("fr-FR")} hab./km²`;
}

export function formatRevenu(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value).toLocaleString("fr-FR")} €/an`;
}

export function formatPct(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)} %`;
}
