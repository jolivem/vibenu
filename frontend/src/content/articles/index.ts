import type { ComponentType } from "react";
import type { ArticleMeta } from "./types";
import { meta as prixArrondissements } from "./prix-m2-arrondissements-paris-lyon-marseille/meta";

/**
 * Le registre des articles publiés, du plus récent au plus ancien : source unique de
 * l'index `/articles`, du sitemap et de `generateStaticParams`. Un article absent d'ici
 * n'existe pas (404), même si son dossier est là — c'est ainsi qu'on garde un brouillon.
 */
interface ArticleEntry {
  meta: ArticleMeta;
  load: () => Promise<{ default: ComponentType }>;
}

export const ARTICLES: ArticleEntry[] = [
  {
    meta: prixArrondissements,
    load: () => import("./prix-m2-arrondissements-paris-lyon-marseille/index.mdx"),
  },
];

export function getArticle(slug: string): ArticleEntry | undefined {
  return ARTICLES.find((a) => a.meta.slug === slug);
}
