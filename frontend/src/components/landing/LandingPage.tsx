import Link from "next/link";
import { SearchPanel } from "@/components/search/SearchPanel";
import { Brand } from "@/components/Brand";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Emphasized } from "@/components/RichText";
import { sectionTitles } from "@/components/analysis/sections";
import { buildLandingFeatures } from "@/components/landing/features";
import { LOCALE_TAGS, localizedHref, type Locale } from "@/i18n/locales";
import type { SectionsMessages } from "@/i18n/messages/fr/analysis/sections";
import type { LandingMessages } from "@/i18n/messages/fr/landing";
import { BRANDING, FEATURES } from "@/lib/site-features";
import { absoluteUrl } from "@/lib/site-url";

/** Les trois villes dotées de pages commune, dans l'ordre des cartes « Explorer ». */
const EXPLORE_CITIES = ["paris", "lyon", "marseille"] as const;

/**
 * La page d'accueil, commune à toutes les langues : chaque route (`/`, `/en`) est une page
 * mince qui lui passe ses messages. Composant serveur — ces textes ne partent pas dans le
 * JavaScript du navigateur.
 */
export function LandingPage({
  locale,
  m,
  sections,
}: {
  locale: Locale;
  m: LandingMessages;
  sections: SectionsMessages;
}) {
  const features = buildLandingFeatures(
    m,
    sectionTitles(sections, FEATURES.showAirQuality),
    FEATURES.showAirQuality,
  );
  const faqItems = m.faq.items({
    showAirQuality: FEATURES.showAirQuality,
    hasSEOPages: FEATURES.hasSEOPages,
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: BRANDING.name,
    url: absoluteUrl(localizedHref(locale, "home")),
    applicationCategory: "RealEstateApplication",
    operatingSystem: "Web",
    description: m.description,
    inLanguage: LOCALE_TAGS[locale],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    // Dérivé des cards visibles : les deux listes décrivaient les mêmes rubriques sans
    // lien entre elles, et avaient fini par diverger.
    featureList: features.map((f) => f.schemaLabel),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main className="landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {FEATURES.hasLandingFaqSection && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link href={localizedHref(locale, "home")} className="landing-brand">
            <Brand />
          </Link>
          <div className="landing-nav-links">
            {FEATURES.hasLandingMarketingSections && <a href="#decouvrez">{m.nav.howItWorks}</a>}
            {FEATURES.hasLandingExploreSection && <a href="#explorer">{m.nav.explore}</a>}
            {FEATURES.hasLandingFaqSection && <a href="#faq">{m.nav.faq}</a>}
            {FEATURES.hasAboutPage && <Link href={localizedHref(locale, "about")}>{m.nav.about}</Link>}
            <LanguageSwitcher route="home" />
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
        <div className="landing-search">
          <SearchPanel />
        </div>
        <div className="landing-trust">
          {m.hero.trust.map((item) => (
            <span key={item}><em>·</em> {item}</span>
          ))}
        </div>
      </section>

      {FEATURES.hasLandingMarketingSections && (
      <>
      <section className="landing-section" id="decouvrez">
        <div className="section-head">
          <h2 className="section-title">
            <Emphasized parts={m.discover.title} />
          </h2>
          <span className="section-meta">{m.discover.count(features.length)}</span>
        </div>
        <div className="features-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.id}>
              <svg
                className="feature-ico"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                {feature.icon}
              </svg>
              <h3>{feature.title}</h3>
              <p>{feature.blurb}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section--alt">
        <div className="section-head">
          <h2 className="section-title">
            <Emphasized parts={m.steps.title} />
          </h2>
          <span className="section-meta">{m.steps.meta}</span>
        </div>
        <div className="steps">
          {m.steps.items.map((step) => (
            <div className="step" key={step.title}>
              <h4>{step.title}</h4>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>
      </>
      )}

      {FEATURES.hasLandingExploreSection && (
      <section className="landing-section" id="explorer">
        <div className="section-head">
          <h2 className="section-title">
            <Emphasized parts={m.explore.title} />
          </h2>
          <span className="section-meta">{m.explore.meta}</span>
        </div>
        <div className="explore-grid">
          {EXPLORE_CITIES.map((city, i) => {
            const card = m.explore.cities[city];
            return (
              // Les pages commune n'existent qu'en français : le lien le dit.
              <Link
                key={city}
                href={`/commune/${city}`}
                hrefLang="fr"
                className={i === 0 ? "explore-card explore-card--featured" : "explore-card"}
              >
                <div className="explore-card-head">
                  <span className="explore-card-eyebrow">{card.region}</span>
                  <h3>{card.name}</h3>
                </div>
                <p>{card.text}</p>
                <span className="explore-card-cta">
                  {card.cta}
                  {m.explore.languageNote && ` ${m.explore.languageNote}`}
                </span>
              </Link>
            );
          })}
          <div className="explore-card explore-card--soon">
            <div className="explore-card-head">
              <span className="explore-card-eyebrow">{m.explore.soon.eyebrow}</span>
              <h3>{m.explore.soon.name}</h3>
            </div>
            <p>{m.explore.soon.text}</p>
            <span className="explore-card-cta is-muted">{m.explore.soon.cta}</span>
          </div>
        </div>
      </section>
      )}

      {FEATURES.hasLandingFaqSection && (
      <section className="landing-section landing-section--alt" id="faq">
        <div className="section-head">
          <h2 className="section-title">
            <Emphasized parts={m.faq.title} />
          </h2>
          <span className="section-meta">{m.faq.meta}</span>
        </div>
        <div className="faq-list">
          {faqItems.map((item) => (
            <details key={item.question} className="faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
      )}

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <Brand variant="footer" />
        </div>
        <span>{m.footer.baseline}</span>
        <div className="landing-footer-links">
          {FEATURES.hasLandingExploreSection && <a href="#explorer">{m.nav.explore}</a>}
          {FEATURES.hasAboutPage && <Link href={localizedHref(locale, "about")}>{m.nav.about}</Link>}
          {/* Répété ici : la navigation du haut est masquée sur mobile. */}
          <LanguageSwitcher route="home" />
        </div>
      </footer>
    </main>
  );
}
