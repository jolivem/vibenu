import type { ComponentType } from "react";
import type { ArticleMeta } from "./types";
import { meta as prixArrondissements } from "./prix-m2-arrondissements-paris-lyon-marseille/meta";
import { meta as ensoleillement } from "./villes-les-plus-ensoleillees-de-france/meta";
import { meta as zoneTendue } from "./zone-tendue-liste-des-communes/meta";
import { meta as loyers } from "./loyer-m2-50-plus-grandes-villes/meta";
import { meta as securite } from "./securite-arrondissements-paris-lyon-marseille/meta";
import { meta as risques } from "./risques-naturels-adresse-catastrophe-naturelle/meta";
import { meta as college } from "./college-de-secteur-paris/meta";
import { meta as municipales } from "./municipales-2026-grandes-villes/meta";
import { meta as deserts } from "./communes-sans-medecin-ni-pharmacie/meta";
import { meta as photos } from "./voir-sa-rue-il-y-a-70-ans-photos-aeriennes/meta";

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
    meta: photos,
    load: () => import("./voir-sa-rue-il-y-a-70-ans-photos-aeriennes/index.mdx"),
  },
  {
    meta: deserts,
    load: () => import("./communes-sans-medecin-ni-pharmacie/index.mdx"),
  },
  {
    meta: municipales,
    load: () => import("./municipales-2026-grandes-villes/index.mdx"),
  },
  {
    meta: college,
    load: () => import("./college-de-secteur-paris/index.mdx"),
  },
  {
    meta: risques,
    load: () => import("./risques-naturels-adresse-catastrophe-naturelle/index.mdx"),
  },
  {
    meta: securite,
    load: () => import("./securite-arrondissements-paris-lyon-marseille/index.mdx"),
  },
  {
    meta: loyers,
    load: () => import("./loyer-m2-50-plus-grandes-villes/index.mdx"),
  },
  {
    meta: zoneTendue,
    load: () => import("./zone-tendue-liste-des-communes/index.mdx"),
  },
  {
    meta: ensoleillement,
    load: () => import("./villes-les-plus-ensoleillees-de-france/index.mdx"),
  },
  {
    meta: prixArrondissements,
    load: () => import("./prix-m2-arrondissements-paris-lyon-marseille/index.mdx"),
  },
];

export function getArticle(slug: string): ArticleEntry | undefined {
  return ARTICLES.find((a) => a.meta.slug === slug);
}
