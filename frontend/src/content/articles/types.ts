/**
 * Les métadonnées d'un article de la rubrique `/articles`.
 *
 * Chaque article vit dans `content/articles/<slug>/` : `meta.ts` (ce type), `index.mdx`
 * (la prose), et le plus souvent `data.json` (l'instantané figé par
 * `scripts/articles/<script>.py`) avec `figures.tsx` (les tableaux et graphes qui le lisent).
 */
export type ArticleKind = "palmares" | "guide";

export interface ArticleAuthor {
  nom: string;
  /** Une personne pour un article signé, l'organisation sinon (JSON-LD `author`). */
  type: "Person" | "Organization";
}

export interface ArticleMeta {
  slug: string;
  kind: ArticleKind;
  /** Titre de la page et `<h1>` : la requête visée d'abord. */
  title: string;
  /** Meta description, ≤ 155 caractères, chiffrée si possible. */
  description: string;
  /** Chapeau sous le `<h1>`. */
  lead: string;
  /** Dates ISO (`2026-11-21`). `updated` avance quand on régénère l'instantané. */
  published: string;
  updated: string;
  author: ArticleAuthor;
  sources: Array<{ nom: string; url?: string }>;
  /** « Pour aller plus loin » : liens internes, pages commune d'abord. */
  related: Array<{ href: string; libelle: string }>;
}
