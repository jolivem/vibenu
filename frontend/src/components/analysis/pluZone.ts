/**
 * Les types de zone d'un PLU — la seule partie nationale du zonage.
 *
 * Un code de zone se lit en deux morceaux, et un seul des deux est interprétable :
 *
 * - `typezone` suit le standard CNIG et ne prend qu'une poignée de valeurs. C'est du
 *   droit : les articles R151-18 à R151-25 du code de l'urbanisme définissent ce
 *   qu'est une zone U, AU, A ou N, pour toute la France.
 * - `libelle` (« UA », « 1AUBc », « Uj », « Ap »…) est **libre**. Chaque PLU nomme ses
 *   secteurs comme il l'entend, et la définition qui fait foi est dans son règlement.
 *   Aucune table de correspondance nationale n'existe pour « UA » : en afficher une
 *   serait inventer une information que la source ne porte pas.
 *
 * D'où le partage ici : on glose ce qui est standardisé, on affiche tel quel ce qui ne
 * l'est pas, et on dit au lecteur laquelle des deux moitiés il regarde.
 *
 * Partagé entre `CadastreCard` et `PdfCadastre`, qui portaient chacun sa table.
 */

export interface PluZoneType {
  /** Nom court, pour la pastille. */
  label: string;
  /**
   * Ce que le code de l'urbanisme dit de cette zone, en une proposition.
   * Vide pour un type inconnu : mieux vaut ne rien gloser que gloser à côté.
   */
  gloss: string;
  className: string;
}

/**
 * ⚠️ `AUc` et `AUs`, pas `AU` : le standard CNIG distingue les deux, et une table qui
 * ne connaît que `AU` retombe sur son défaut pour toutes les zones à urbaniser. Relevé
 * sur le PLUi Bassée-Montois, où les deux valeurs coexistent.
 *
 * La différence est celle de l'article R151-20 : quand les équipements en périphérie
 * immédiate ont une capacité suffisante, la zone est constructible (`AUc`) ; sinon,
 * l'ouverture à l'urbanisation est subordonnée à une modification ou une révision du
 * PLU (`AUs`). Pour un acheteur, ce n'est pas un détail — c'est la différence entre un
 * terrain constructible et un terrain qui ne le sera peut-être jamais.
 */
const ZONE_TYPES: Record<string, PluZoneType> = {
  U: {
    label: "Urbain",
    gloss:
      "secteur déjà urbanisé, ou dont les équipements suffisent à desservir de nouvelles constructions",
    className: "zone-badge zone-badge--u",
  },
  AUc: {
    label: "À urbaniser",
    gloss:
      "destiné à être urbanisé, les équipements en périphérie immédiate ayant une capacité suffisante",
    className: "zone-badge zone-badge--au",
  },
  AUs: {
    label: "À urbaniser à terme",
    gloss:
      "destiné à être urbanisé, mais son ouverture suppose d'abord une modification ou une révision du PLU",
    className: "zone-badge zone-badge--au",
  },
  A: {
    label: "Agricole",
    gloss:
      "terres protégées en raison de leur potentiel agronomique, biologique ou économique",
    className: "zone-badge zone-badge--a",
  },
  N: {
    label: "Naturel",
    gloss:
      "espaces naturels ou forestiers protégés — qualité des sites, ressources naturelles, ou prévention des risques",
    className: "zone-badge zone-badge--n",
  },
};

/** Type inconnu : on affiche le code brut, sans glose. */
function unknown(typezone: string): PluZoneType {
  return { label: typezone, gloss: "", className: "zone-badge" };
}

/**
 * Le type de zone, tolérant aux variantes.
 *
 * La correspondance exacte d'abord, puis le préfixe `AU` : un document qui écrirait
 * `AU` tout court, ou une variante non prévue, vaut mieux rangé sous « à urbaniser »
 * que rendu tel quel. Au-delà, on ne devine pas.
 */
export function pluZoneType(typezone: string): PluZoneType {
  const key = typezone.trim();
  if (ZONE_TYPES[key]) return ZONE_TYPES[key];
  if (key.toUpperCase().startsWith("AU")) return ZONE_TYPES.AUc;
  return unknown(key);
}

/**
 * Le libellé long du secteur, ou `null`.
 *
 * `libelong` est facultatif dans le standard, et massivement vide en pratique : sur le
 * PLUi Bassée-Montois, 404 zones sur 405 le laissent à `""`. Le rendre tel quel posait
 * un élément vide dans la ligne — d'où ce passage explicite par `null`, qui laisse les
 * composants décider de ne rien afficher.
 */
export function pluZoneLongLabel(label: string | null | undefined): string | null {
  const text = label?.trim();
  return text ? text : null;
}
