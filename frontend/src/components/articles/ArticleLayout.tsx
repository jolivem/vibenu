import Link from "next/link";
import { Brand } from "@/components/Brand";
import { BRANDING, FEATURES } from "@/lib/site-features";
import { createFormat } from "@/i18n/format";
import type { ArticleKind, ArticleMeta } from "@/content/articles/types";

const fmt = createFormat("fr");

export const KIND_LABEL: Record<ArticleKind, string> = {
  palmares: "Palmarès chiffré",
  guide: "Guide pratique",
};

/** La navigation et le pied communs à l'index et aux articles. */
export function ArticlesNav() {
  return (
    <nav className="landing-nav">
      <div className="landing-nav-inner">
        <Link href="/" className="landing-brand">
          <Brand />
        </Link>
        <div className="landing-nav-links">
          <Link href="/">Analyser une adresse</Link>
          <Link href="/articles">Articles</Link>
          {FEATURES.hasAboutPage && <Link href="/a-propos">À propos</Link>}
        </div>
      </div>
    </nav>
  );
}

export function ArticlesFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-brand">
        <Brand variant="footer" />
      </div>
      <span>Données publiques</span>
      <div className="landing-footer-links">
        <Link href="/">Analyser une adresse</Link>
        <Link href="/articles">Articles</Link>
        {FEATURES.hasAboutPage && <Link href="/a-propos">À propos</Link>}
      </div>
    </footer>
  );
}

/**
 * L'habillage d'un article : en-tête daté et signé, prose MDX, sources, liens internes.
 * JSON-LD `Article` et `BreadcrumbList`.
 */
export function ArticleLayout({ meta, children }: { meta: ArticleMeta; children: React.ReactNode }) {
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
  const url = `${siteUrl}/articles/${meta.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: meta.title,
      description: meta.description,
      datePublished: meta.published,
      dateModified: meta.updated,
      inLanguage: "fr-FR",
      mainEntityOfPage: url,
      author: { "@type": meta.author.type, name: meta.author.nom },
      publisher: { "@type": "Organization", name: BRANDING.name, url: siteUrl },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Articles", item: `${siteUrl}/articles` },
        { "@type": "ListItem", position: 3, name: meta.title, item: url },
      ],
    },
  ];

  return (
    <main className="landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticlesNav />

      <header className="commune-hero article-hero">
        <nav className="article-breadcrumb" aria-label="Fil d'Ariane">
          <Link href="/articles">Articles</Link> · {KIND_LABEL[meta.kind]}
        </nav>
        <h1 className="commune-title">{meta.title}</h1>
        <p className="commune-lead">{meta.lead}</p>
        <p className="article-byline">
          Par {meta.author.nom} · publié le <time dateTime={meta.published}>{fmt.dateLong(meta.published)}</time>
          {meta.updated !== meta.published && (
            <>
              {" "}· mis à jour le <time dateTime={meta.updated}>{fmt.dateLong(meta.updated)}</time>
            </>
          )}
        </p>
      </header>

      <article className="article-body">
        {children}

        <aside className="article-sources">
          <h2>Sources et méthode</h2>
          <ul>
            {meta.sources.map((s) => (
              <li key={s.nom}>{s.url ? <a href={s.url}>{s.nom}</a> : s.nom}</li>
            ))}
          </ul>
          <p>
            Définitions détaillées : <Link href="/commune/methode">méthode et sources</Link>.
          </p>
        </aside>

        {meta.related.length > 0 && (
          <nav className="article-related" aria-label="Pour aller plus loin">
            <h2>Pour aller plus loin</h2>
            <ul>
              {meta.related.map((r) => (
                <li key={r.href}>
                  <Link href={r.href}>{r.libelle}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <p className="article-cta">
          <Link href="/" className="article-cta-button">
            Analyser une adresse
          </Link>
          <span>Prix, risques, écoles, sécurité : les mêmes données, à l&apos;échelle d&apos;une adresse.</span>
        </p>
      </article>

      <ArticlesFooter />
    </main>
  );
}
