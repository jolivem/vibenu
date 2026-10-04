/**
 * Formes de texte « riche » que les dictionnaires peuvent porter sans contenir de JSX :
 * ils restent ainsi de simples fichiers `.ts`, lisibles côté serveur comme côté client.
 * Leur rendu est dans `components/RichText.tsx`.
 */

/**
 * Un titre dont une partie est mise en valeur : `[avant, en italique, après]`. La place de
 * l'emphase dépend de la langue, d'où le triplet plutôt qu'un couple.
 */
export type Emphasis = readonly [before: string, emphasis: string, after: string];

/** Un paragraphe : une chaîne, ou une suite de segments dont certains sont en gras. */
export type Rich = string | ReadonlyArray<string | { strong: string }>;
