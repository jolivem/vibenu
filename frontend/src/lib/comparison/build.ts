import type {
  Cellule,
  ColonneReference,
  Comparaison,
  IndicateurComparable,
  Lieu,
  ReferenceKind,
} from "./types";

/**
 * Lit chaque indicateur sur chaque lieu, et les repères sur leur propre source.
 *
 * Un repère est une source à part (l'arrondissement qui porte le chiffre de sa ville, le
 * département d'une adresse) : deux adresses de départements différents donneront deux
 * colonnes « Département ».
 */
export function construireComparaison<Src>(
  lieux: Array<{ lieu: Lieu; src: Src }>,
  indicateurs: Array<IndicateurComparable<Src>>,
  references: Array<{ id: string; kind: ReferenceKind; nom: string; src: Src }> = [],
): Comparaison {
  const cellules: Comparaison["cellules"] = {};
  for (const ind of indicateurs) {
    cellules[ind.id] = lieux.map(({ src }): Cellule => {
      const valeur = ind.value(src);
      return { valeur, masque: valeur === null && (ind.masque?.(src) ?? false) };
    });
  }
  const colonnes: ColonneReference[] = references.map((ref) => ({
    id: ref.id,
    kind: ref.kind,
    nom: ref.nom,
    cellules: Object.fromEntries(
      indicateurs.map((ind) => [ind.id, ind.references?.[ref.kind]?.(ref.src) ?? null]),
    ),
  }));
  return { lieux: lieux.map((l) => l.lieu), cellules, references: colonnes };
}

/** Les valeurs d'un indicateur, dans l'ordre des lieux (`null` si masquée ou absente). */
export function valeursDe(comparaison: Comparaison, id: keyof Comparaison["cellules"]): (number | null)[] {
  return (comparaison.cellules[id] ?? []).map((c) => c.valeur);
}
