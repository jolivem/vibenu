/**
 * Classer des lieux sur un indicateur — des faits, aucune phrase.
 *
 * Partagé par les phrases de rang des pages d'arrondissement (`cityComparison.ts`) et par le
 * comparatif de la ville : « 3e sur 20 » ne peut pas se lire différemment sur les deux.
 */

/** En dessous, un rang ne dit plus rien. */
export const MIN_CLASSES = 5;

export interface Rang {
  /** 1 = valeur la plus haute. */
  rang: number;
  total: number;
}

/** Le rang de chaque valeur (ex aequo au même rang), `null` pour une valeur absente ou trop peu de valeurs. */
export function rangs(valeurs: Array<number | null>): Array<Rang | null> {
  const connues = valeurs.filter((v): v is number => v !== null);
  if (connues.length < MIN_CLASSES) return valeurs.map(() => null);
  return valeurs.map((v) =>
    v === null ? null : { rang: 1 + connues.filter((x) => x > v).length, total: connues.length },
  );
}

/**
 * Haut et bas se partagent chacun le premier tiers : ce qui est entre les deux n'est ni l'un
 * ni l'autre, et le dire ainsi évite le « 10e moins cher » qui se lit comme un superlatif.
 */
export function position({ rang, total }: Rang): "haut" | "bas" | "milieu" {
  const tiers = Math.ceil(total / 3);
  if (rang <= tiers) return "haut";
  if (total - rang + 1 <= tiers) return "bas";
  return "milieu";
}

export interface Extremes {
  /** Index des lieux dans le tableau d'origine. */
  max: { index: number; valeur: number };
  min: { index: number; valeur: number };
  nbConnues: number;
}

/** La plus haute et la plus basse valeur, `null` sous `MIN_CLASSES` valeurs connues. */
export function extremes(valeurs: Array<number | null>): Extremes | null {
  let max: Extremes["max"] | null = null;
  let min: Extremes["min"] | null = null;
  let nbConnues = 0;
  valeurs.forEach((v, index) => {
    if (v === null) return;
    nbConnues += 1;
    if (!max || v > max.valeur) max = { index, valeur: v };
    if (!min || v < min.valeur) min = { index, valeur: v };
  });
  if (!max || !min || nbConnues < MIN_CLASSES) return null;
  return { max, min, nbConnues };
}

/** « 1,8 fois » : rapport du plus haut au plus bas, `null` si le plus bas est nul. */
export function rapport({ max, min }: Extremes): number | null {
  return min.valeur > 0 ? max.valeur / min.valeur : null;
}
