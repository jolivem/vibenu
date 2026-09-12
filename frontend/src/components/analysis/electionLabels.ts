/**
 * Libellés en clair des étiquettes politiques.
 *
 * Deux usages, et c'est pour le second qu'ils vivent ici plutôt que dans les cards :
 *
 * - la card Municipales affiche `NUANCE_LABEL` comme nom de liste ;
 * - le réducteur des mini-synthèses envoie **les libellés et non les codes** au modèle.
 *   Sans cela, la phrase sortait « la liste LDVD arrive en tête » — un sigle du ministère
 *   de l'Intérieur, illisible pour qui ne le connaît pas. Le modèle ne peut pas deviner
 *   ce que « LDVD » veut dire : il faut le lui donner.
 *
 * Les codes restent affichés tels quels dans la card Présidentielle, en petite pastille
 * derrière le nom du candidat : à cet endroit c'est une abréviation assumée, adossée à un
 * nom propre qui porte l'information.
 */

/** Nuances des listes municipales. Préfixées « L » (liste) par le ministère. */
export const NUANCE_LABEL: Record<string, string> = {
  LEXG: "Extrême gauche",
  LFI: "La France insoumise",
  LCOM: "Communiste",
  LSOC: "Socialiste",
  LUG: "Union de la gauche",
  LVEC: "Écologiste",
  LDVG: "Divers gauche",
  LDIV: "Divers",
  LREG: "Régionaliste",
  LDVC: "Divers centre",
  LENS: "Ensemble",
  LMDM: "Modem",
  LUDI: "UDI",
  LLR: "Les Républicains",
  LDVD: "Divers droite",
  LUD: "Union de la droite",
  LRN: "Rassemblement national",
  LEXD: "Extrême droite",
  LUXD: "Union extrême droite",
};

/** Étiquettes des candidats de la présidentielle 2022, 1er tour. */
export const PARTI_LABEL: Record<string, string> = {
  LO: "Lutte ouvrière",
  PCF: "Parti communiste français",
  LFI: "La France insoumise",
  PS: "Parti socialiste",
  EELV: "Europe Écologie Les Verts",
  REN: "Renaissance",
  RES: "Résistons",
  DLF: "Debout la France",
  LR: "Les Républicains",
  REC: "Reconquête",
  RN: "Rassemblement national",
  NPA: "Nouveau Parti anticapitaliste",
};
