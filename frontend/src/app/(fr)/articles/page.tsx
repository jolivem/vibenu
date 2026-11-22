import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArticlesFooter, ArticlesNav, KIND_LABEL } from "@/components/articles/ArticleLayout";
import { ARTICLES } from "@/content/articles";
import { createFormat } from "@/i18n/format";
import { FEATURES } from "@/lib/site-features";

const fmt = createFormat("fr");

export const metadata: Metadata = {
  title: "Articles : prix, risques, logement, chiffres des données publiques",
  description:
    "Palmarès chiffrés et guides pratiques tirés des données publiques : prix de vente réels, taxe foncière, zone tendue, risques naturels, équipements des communes.",
  alternates: { canonical: "/articles" },
};

export default function ArticlesIndexPage() {
  if (!FEATURES.hasArticles) notFound();

  return (
    <main className="landing">
      <ArticlesNav />
      <section className="commune-hero article-hero">
        <span className="landing-eyebrow">Articles</span>
        <h1 className="commune-title">Ce que disent les données publiques</h1>
        <p className="commune-lead">
          Des palmarès et des guides écrits à partir des mêmes données que l&apos;analyse
          d&apos;adresse : ventes réelles, fiscalité locale, risques, équipements. Chaque chiffre
          est daté et sourcé.
        </p>
      </section>

      <div className="page-shell article-index">
        {ARTICLES.map(({ meta }) => (
          <article key={meta.slug} className="card article-card">
            <span className="landing-eyebrow">{KIND_LABEL[meta.kind]}</span>
            <h2>
              <Link href={`/articles/${meta.slug}`}>{meta.title}</Link>
            </h2>
            <p>{meta.description}</p>
            <time dateTime={meta.updated}>{fmt.dateLong(meta.updated)}</time>
          </article>
        ))}
      </div>

      <ArticlesFooter />
    </main>
  );
}
