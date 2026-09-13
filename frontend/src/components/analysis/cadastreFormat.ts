import { formatFr } from "@/lib/format";

/** Surface d'une parcelle — partagée par la card Cadastre, le PDF et sa couverture. */
export function formatSurface(m2: number): string {
  if (m2 >= 10_000) {
    return `${(m2 / 10_000).toFixed(2)} ha`;
  }
  return `${formatFr(m2)} m²`;
}
