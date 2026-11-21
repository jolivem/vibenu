import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArticleLayout } from "@/components/articles/ArticleLayout";
import { ARTICLES, getArticle } from "@/content/articles";
import { FEATURES } from "@/lib/site-features";

/** Un article : statique, uniquement ceux du registre. */
export const dynamicParams = false;

export function generateStaticParams() {
  return FEATURES.hasArticles ? ARTICLES.map((a) => ({ slug: a.meta.slug })) : [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticle((await params).slug);
  if (!article) return {};
  const { meta } = article;
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/articles/${meta.slug}` },
    openGraph: {
      type: "article",
      title: meta.title,
      description: meta.description,
      publishedTime: meta.published,
      modifiedTime: meta.updated,
      locale: "fr_FR",
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = FEATURES.hasArticles ? getArticle((await params).slug) : undefined;
  if (!article) notFound();
  const { default: Body } = await article.load();
  return (
    <ArticleLayout meta={article.meta}>
      <Body />
    </ArticleLayout>
  );
}
