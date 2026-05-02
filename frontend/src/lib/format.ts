export function formatFr(value: number): string {
  return value.toLocaleString("fr-FR").replace(/[  ]/g, " ");
}
