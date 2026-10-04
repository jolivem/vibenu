import type { NearbyMessages } from "@/i18n/messages/fr/analysis/nearby";
import type { CommuneEquipmentDto } from "@/types/location-analysis";

type Rubric = CommuneEquipmentDto["families"][number]["rubrics"][number];
type Messages = NearbyMessages["communeEquipment"];

/** Assez de décimales pour que la plus petite des valeurs comparées ne s'affiche pas « 0 ». */
function densityDigits(...values: number[]): number {
  const smallest = Math.min(...values);
  return smallest < 1 ? 2 : smallest < 10 ? 1 : 0;
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

/** Densité pour 10 000 habitants, comparée à la France quand la localisation est sûre. */
export function equipmentDensity(rubric: Rubric, m: Messages): string {
  const france = rubric.francePer10k ?? null;
  const compared = !rubric.locationUncertain && france !== null;
  return m.density({
    per10k: rubric.per10k,
    france,
    digits: compared ? densityDigits(rubric.per10k, france) : densityDigits(rubric.per10k),
    uncertain: Boolean(rubric.locationUncertain),
  });
}

/** Fiche PDF : nombre, puis densité quand la commune est assez peuplée pour la calculer. */
export function equipmentLine(rubric: Rubric, population: number, m: Messages): string {
  return m.line(m.count(rubric.count), showsDensity(population) ? equipmentDensity(rubric, m) : null);
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

/** Libellé d'une rubrique dans la langue de la page ; à défaut, celui du serveur. */
export function rubricLabel(rubric: Pick<Rubric, "key" | "label">, m: Messages): string {
  return m.rubrics[rubric.key] ?? rubric.label;
}

export function familyTitle(family: { key: string; title: string }, m: Messages): string {
  return m.families[family.key] ?? family.title;
}

export function absentLine(absent: readonly Rubric[], m: Messages): string {
  return m.absent(absent.map((rubric) => rubricLabel(rubric, m)));
}

export function equipmentFootnote(equipment: Pick<CommuneEquipmentDto, "population">, m: Messages): string {
  return m.footnote({
    population: equipment.population,
    withDensity: showsDensity(equipment.population),
    minPopulation: MIN_POPULATION_FOR_DENSITY,
  });
}
