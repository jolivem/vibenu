import type { CommuneEquipmentDto } from "@/types/location-analysis";
import { formatFr } from "@/lib/format";

type Rubric = CommuneEquipmentDto["families"][number]["rubrics"][number];

/**
 * Décimales d'une paire de densités, fixées par la plus petite des deux : deux sous 1, une
 * sous 10, aucune au-delà.
 *
 * Commune et France partagent la même précision, pour se comparer d'un coup d'œil : chaque
 * valeur réglée sur sa propre taille donnait « 11 (France 9,1) » et « 0,09 (France 0,1) ».
 */
function densityDigits(...values: number[]): number {
  const smallest = Math.min(...values);
  return smallest < 1 ? 2 : smallest < 10 ? 1 : 0;
}

function formatDensity(value: number, digits: number): string {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * « 11,2 pour 10 000 hab. (France 9,1) » — partagé par la card et le PDF.
 *
 * Sans comparaison quand la localisation est incertaine : comparer à la France un nombre
 * faussé par la BPE (les bibliothèques de toute une ville rattachées à un arrondissement)
 * en amplifierait l'erreur.
 */
export function equipmentDensity(rubric: Rubric): string {
  const france = rubric.francePer10k;
  if (rubric.locationUncertain || france == null) {
    return `${formatDensity(rubric.per10k, densityDigits(rubric.per10k))} pour 10 000 hab.${rubric.locationUncertain ? " (localisation incertaine)" : ""}`;
  }
  const digits = densityDigits(rubric.per10k, france);
  return `${formatDensity(rubric.per10k, digits)} pour 10 000 hab. (France ${formatDensity(france, digits)})`;
}

/** « 246 — 11,2 pour 10 000 hab. (France 9,1) ». À zéro, le seul repère France. */
export function equipmentLine(rubric: Rubric): string {
  if (rubric.count === 0) {
    const france = rubric.francePer10k;
    return france != null
      ? `0 (France ${formatDensity(france, densityDigits(france))} pour 10 000 hab.)`
      : "0";
  }
  return `${formatFr(rubric.count)} — ${equipmentDensity(rubric)}`;
}
