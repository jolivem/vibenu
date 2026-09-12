/**
 * Nom d'équipement lisible, quelle que soit la source.
 *
 * OSM écrit en casse normale — « Lycée général privé Saint-Marc ». La BPE de l'INSEE
 * écrit **tout en capitales et sans accents** — « ECOLE 2D DEGRE PROF.PRIVEE ELEA
 * PRESQU'ILE ». Les deux cohabitent dans la même liste, et les lignes de la BPE y
 * crient.
 *
 * Corriger à la lecture plutôt qu'à l'import : le nom est déjà en base pour des millions
 * d'équipements, et la casse n'entre pas dans les comparaisons de dédoublonnage, qui
 * passent toutes par `normalizeName`. Rien ne dépend donc de la forme brute.
 *
 * Pourquoi une capitale à chaque mot plutôt qu'une simple majuscule initiale : le corpus
 * est plein de noms propres — ELEA, FRESNEL, SAINT-MARC. Une casse de phrase les
 * écraserait (« elea presqu'île »), ce qui est une faute ; une capitale de trop sur un mot
 * courant n'est qu'une inélégance. On choisit l'inélégance.
 */

/**
 * Mots qui ne prennent pas de capitale, sauf en tête de nom ou après une coupure.
 *
 * Prépositions et conjonctions seulement. Les articles en sont exclus volontairement :
 * ils ouvrent très souvent le nom propre lui-même — « IME Les Papillons Blancs »,
 * « École maternelle La Petite École » — et « IME les Papillons » se lisait mal.
 */
const LOWERCASE_WORDS = new Set([
  "de", "du", "des", "et", "en", "au", "aux", "sur", "sous", "a", "pour", "par",
  "chez", "lez", "d", "l",
]);

/**
 * Sigles à laisser en capitales.
 *
 * La BPE en use abondamment pour les établissements scolaires et médico-sociaux, et
 * « Lpo » ou « Ime » ne veulent rien dire. Liste explicite plutôt qu'une heuristique de
 * longueur : « LES » et « AUX » font aussi trois lettres.
 */
const ACRONYMS = new Set([
  "LPO", "LP", "LGT", "CLG", "SEP", "SEGPA", "ULIS", "EREA", "IME", "ITEP", "MFR",
  "CFA", "MECS", "SESSAD", "EHPAD", "CCAS", "CPAM", "SDIS", "UFR", "IUT", "BTS",
  "ZAC", "HLM", "CHU", "CHR", "SMUR", "PMI",
]);

/**
 * Accents que la BPE ne transporte pas, pour le vocabulaire qui revient sans cesse.
 *
 * Limité aux mots dont la forme accentuée est sans ambiguïté. Un nom propre non accentué
 * reste tel quel : on ne devine pas « Chateaubriand » en « Châteaubriand », faute de
 * savoir si la graphie officielle porte l'accent.
 */
const ACCENTS: Record<string, string> = {
  ecole: "école",
  ecoles: "écoles",
  elementaire: "élémentaire",
  prescolaire: "préscolaire",
  college: "collège",
  colleges: "collèges",
  lycee: "lycée",
  lycees: "lycées",
  prive: "privé",
  privee: "privée",
  prives: "privés",
  privees: "privées",
  general: "général",
  generale: "générale",
  degre: "degré",
  superieur: "supérieur",
  superieure: "supérieure",
  specialise: "spécialisé",
  specialisee: "spécialisée",
  etablissement: "établissement",
  eleves: "élèves",
  mediatheque: "médiathèque",
  bibliotheque: "bibliothèque",
  supermarche: "supermarché",
  marche: "marché",
  hopital: "hôpital",
  creche: "crèche",
  cinema: "cinéma",
  theatre: "théâtre",
  sante: "santé",
  securite: "sécurité",
  ile: "île",
  iles: "îles",
  agree: "agréé",
  agreee: "agréée",
  metier: "métier",
  metiers: "métiers",
  patisserie: "pâtisserie",
  epicerie: "épicerie",
  eglise: "église",
  cite: "cité",
  residence: "résidence",
  cimetiere: "cimetière",
  medecin: "médecin",
  veterinaire: "vétérinaire",
};

function capitalize(word: string): string {
  return word.charAt(0).toLocaleUpperCase("fr-FR") + word.slice(1);
}

/** Un segment sans espace ni tiret, éventuellement coupé par une apostrophe. */
function formatSegment(segment: string, atPhraseStart: boolean): string {
  const upper = segment.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (upper && ACRONYMS.has(upper)) return segment.toLocaleUpperCase("fr-FR");

  const lower = segment.toLocaleLowerCase("fr-FR");

  // Élision : « D'ARTAGNAN » donne « d'Artagnan », mais « PRESQU'ILE » donne
  // « Presqu'île » — c'est le mot qui suit l'apostrophe qui porte la capitale, et
  // seulement quand ce qui précède est un « d' » ou un « l' ».
  const elision = lower.match(/^([dl])['’](.+)$/);
  if (elision) {
    const [, particle, rest] = elision;
    const tail = accentuate(rest);
    return `${atPhraseStart ? capitalize(particle) : particle}${segment.includes("’") ? "’" : "'"}${capitalize(tail)}`;
  }

  const [head, ...tail] = lower.split(/(?=['’])/);
  const accented = accentuate(head) + tail.map(accentuate).join("");

  if (!atPhraseStart && LOWERCASE_WORDS.has(lower)) return accented;
  return capitalize(accented);
}

function accentuate(word: string): string {
  const bare = word.replace(/^['’]/, "");
  const prefix = word.length > bare.length ? word[0] : "";
  return prefix + (ACCENTS[bare] ?? bare);
}

/**
 * Rend le nom tel quel dès qu'il contient une minuscule : c'est alors une graphie
 * choisie — par un contributeur OSM — et la retoucher ferait plus de dégâts que de bien.
 * Seuls les noms intégralement en capitales sont reformatés.
 */
export function toDisplayName(raw: string): string {
  if (/\p{Ll}/u.test(raw)) return raw;

  let phraseStart = true;
  // Le point est une coupure au même titre que le tiret : la BPE colle ses abréviations
  // (« PROF.PRIVEE »), et sans lui le tout formait un seul mot introuvable au lexique.
  return raw.replace(/[^\s\-.]+|[\s\-.]+/gu, (chunk) => {
    if (/^[\s\-.]+$/.test(chunk)) {
      if (/[-.]/.test(chunk)) phraseStart = true;
      return chunk;
    }
    const formatted = formatSegment(chunk, phraseStart);
    phraseStart = false;
    return formatted;
  });
}
