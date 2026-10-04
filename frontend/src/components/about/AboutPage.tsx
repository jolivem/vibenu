import Link from "next/link";
import type { Metadata } from "next";
import { Brand } from "@/components/Brand";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Emphasized, RichText } from "@/components/RichText";
import {
  LOCALE_TAGS,
  OPEN_GRAPH_LOCALES,
  languageAlternates,
  localizedHref,
  type Locale,
} from "@/i18n/locales";
import type { AboutMessages } from "@/i18n/messages/fr/about";
import type { LandingMessages } from "@/i18n/messages/fr/landing";
import type { Emphasis, Rich } from "@/i18n/types";
import { FEATURES } from "@/lib/site-features";
import { absoluteUrl } from "@/lib/site-url";

const CONTACT_EMAIL = "jolivet.michel@free.fr";

/** Métadonnées de la page « À propos » dans une langue. */
export function aboutMetadata(locale: Locale, m: AboutMessages): Metadata {
  const path = localizedHref(locale, "about");
  return {
    title: m.meta.title,
    description: m.meta.description,
    alternates: {
      canonical: path,
      ...(FEATURES.englishLaunched ? { languages: languageAlternates("about") } : {}),
    },
    openGraph: {
      type: "article",
      locale: OPEN_GRAPH_LOCALES[locale],
      url: absoluteUrl(path),
      title: m.meta.title,
      description: m.meta.openGraphDescription,
    },
  };
}

function Section({
  id,
  alt = false,
  title,
  meta,
  children,
}: {
  id: string;
  alt?: boolean;
  title: Emphasis;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <section className={alt ? "landing-section landing-section--alt" : "landing-section"} id={id}>
      <div className="section-head">
        <h2 className="section-title">
          <Emphasized parts={title} />
        </h2>
        <span className="section-meta">{meta}</span>
      </div>
      {children}
    </section>
  );
}

function Prose({ paragraphs, children }: { paragraphs: Rich[]; children?: React.ReactNode }) {
  return (
    <div className="about-prose">
      {paragraphs.map((paragraph, i) => (
        <p key={i}>
          <RichText text={paragraph} />
        </p>
      ))}
      {children}
    </div>
  );
}

/**
 * La page « À propos », commune à toutes les langues : chaque route (`/a-propos`,
 * `/en/about`) est une page mince qui lui passe ses messages. Composant serveur.
 *
 * Les ancres (`#mission`, `#sources`…) sont techniques et ne se traduisent pas.
 */
export function AboutPage({
  locale,
  m,
  landing,
}: {
  locale: Locale;
  m: AboutMessages;
  /** Navigation et pied de page, partagés avec l'accueil. */
  landing: Pick<LandingMessages, "nav" | "footer">;
}) {
  const home = localizedHref(locale, "home");
  const aboutPath = localizedHref(locale, "about");
  const shownSources = m.sources.items.filter((s) => s.id !== "air" || FEATURES.showAirQuality);

  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: m.meta.schemaName,
    url: absoluteUrl(aboutPath),
    inLanguage: LOCALE_TAGS[locale],
    description: m.meta.schemaDescription,
  };

  return (
    <main className="landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />

      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link href={home} className="landing-brand">
            <Brand />
          </Link>
          <div className="landing-nav-links">
            <Link href={localizedHref(locale, "home", { hash: "decouvrez" })}>{landing.nav.howItWorks}</Link>
            <Link href={localizedHref(locale, "home", { hash: "faq" })}>{landing.nav.faq}</Link>
            <Link href={aboutPath} aria-current="page">{landing.nav.about}</Link>
            <LanguageSwitcher route="about" />
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <span className="landing-eyebrow">{m.hero.eyebrow}</span>
        <h1 className="landing-title">
          {m.hero.title}<br />
          <i>{m.hero.emphasis}</i>
        </h1>
        <p className="landing-lead">{m.hero.lead}</p>
      </section>

      <Section id="mission" title={m.mission.title} meta={m.mission.meta}>
        <Prose paragraphs={m.mission.paragraphs} />
      </Section>

      <Section id="sources" alt title={m.sources.title} meta={m.sources.meta}>
        <div className="about-sources">
          {shownSources.map((s) => (
            <article key={s.name} className="about-source">
              <h3>{s.name}</h3>
              <span className="about-source-issuer">{s.issuer}</span>
              <p>{s.desc}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="methodologie" title={m.method.title} meta={m.method.meta}>
        <Prose paragraphs={m.method.paragraphs} />
      </Section>

      <Section id="limites" alt title={m.limits.title} meta={m.limits.meta}>
        <Prose paragraphs={m.limits.paragraphs} />
      </Section>

      {m.glossary && (
        <Section id="glossary" alt title={m.glossary.title} meta={m.glossary.meta}>
          <div className="about-sources">
            {m.glossary.items.map((item) => (
              <article key={item.term} className="about-source">
                {/* Le terme reste en français, sa définition est dans la langue de la page. */}
                <h3 lang="fr">{item.term}</h3>
                <p>{item.definition}</p>
              </article>
            ))}
          </div>
        </Section>
      )}

      <Section id="presse" title={m.press.title} meta={m.press.meta}>
        <Prose paragraphs={m.press.paragraphs}>
          <p>
            {m.press.contact[0]}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            {m.press.contact[1]}
          </p>
        </Prose>
      </Section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <Brand variant="footer" />
        </div>
        <span>{landing.footer.baseline}</span>
        <div className="landing-footer-links">
          <Link href={home}>{m.footer.analyze}</Link>
          <a href={`mailto:${CONTACT_EMAIL}`}>{m.footer.contact}</a>
          <LanguageSwitcher route="about" />
        </div>
      </footer>
    </main>
  );
}
