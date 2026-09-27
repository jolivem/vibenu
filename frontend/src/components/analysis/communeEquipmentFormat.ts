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
 * Population sous laquelle une densité n'a plus de sens : à Salvizinet (615 hab.), une
 * seule bibliothèque fait « 16 pour 10 000 hab. (France 2,3) ». Une unité de plus ou de
 * moins suffit à faire varier le ratio du tout au tout ; seul le nombre est affiché.
 */
export const MIN_POPULATION_FOR_DENSITY = 2_000;

export function showsDensity(population: number): boolean {
  return population >= MIN_POPULATION_FOR_DENSITY;
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

/** « 246 — 11,2 pour 10 000 hab. (France 9,1) », ou « 1 » seul sous le seuil de population. */
export function equipmentLine(rubric: Rubric, population: number): string {
  const count = formatFr(rubric.count);
  return showsDensity(population) ? `${count} — ${equipmentDensity(rubric)}` : count;
}

/**
 * Rubriques présentes d'un côté, absentes de l'autre : une petite commune alignait seize
 * lignes « 0 » pour dire qu'elle n'a ni pharmacie, ni école, ni boulangerie.
 */
export function splitRubrics(rubrics: readonly Rubric[]): { present: Rubric[]; absent: Rubric[] } {
  return {
    present: rubrics.filter((rubric) => rubric.count > 0),
    absent: rubrics.filter((rubric) => rubric.count === 0),
  };
}

/** « Absents de la commune : pharmacies, services d'urgences ». */
export function absentLine(absent: readonly Rubric[]): string {
  const labels = absent.map((rubric) => rubric.label.charAt(0).toLocaleLowerCase("fr-FR") + rubric.label.slice(1));
  return `Absents de la commune : ${labels.join(", ")}`;
}

/** Note de bas de card, commune à l'écran et au PDF. */
export function equipmentFootnote(equipment: Pick<CommuneEquipmentDto, "population">): string {
  const population = formatFr(equipment.population);
  return showsDensity(equipment.population)
    ? `Équipements recensés dans la commune en 2025 (${population} habitants), et leur densité pour 10 000 habitants comparée à celle de la France entière.`
    : `Équipements recensés dans la commune en 2025 (${population} habitants). Sous ${formatFr(MIN_POPULATION_FOR_DENSITY)} habitants, les densités ne sont pas calculées : une seule unité suffit à les fausser.`;
}
