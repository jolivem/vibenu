import type { Format } from "@/i18n/format";
import type { ComparisonMessages } from "@/i18n/messages/fr/analysis/comparison";
import type { Cellule, Unite } from "./types";

/** Le nombre seul, sans unité : pour l'infobulle du tri et les barres. */
export function formatNombre(valeur: number, decimales: number, fmt: Format): string {
  return decimales === 0 ? fmt.int(valeur) : fmt.decimal(valeur, decimales, decimales);
}

/** « 10 520 €/m² », « — » pour une absence, « secret stat. » pour une valeur tue. */
export function formatCellule(
  cellule: Cellule,
  unite: Unite,
  decimales: number,
  fmt: Format,
  m: ComparisonMessages,
): string {
  if (cellule.valeur === null) return cellule.masque ? m.masque : m.manquant;
  return m.unites[unite](formatNombre(cellule.valeur, decimales, fmt));
}
