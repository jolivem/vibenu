import Link from "next/link";
import { SearchPanel } from "@/components/search/SearchPanel";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ClaireAdresse",
  url: SITE_URL,
  applicationCategory: "RealEstateApplication",
  operatingSystem: "Web",
  description:
    "Analyse d'une adresse en France : transports, risques naturels, cadastre, prix immobiliers DVF, urbanisme et démographie IRIS.",
  inLanguage: "fr-FR",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
  featureList: [
    "Analyse de mobilité et transports",
    "Risques naturels et technologiques",
    "Cadastre et zones d'urbanisme",
    "Prix immobiliers DVF",
    "Démographie INSEE IRIS",
    "Qualité de l'air",
  ],
};

export default function HomePage() {
  return (
    <main className="landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-brand">
            Claire<i>Adresse</i>
          </Link>
          <div className="landing-nav-links">
            <a href="#decouvrez">Comment ça marche</a>
            <a href="#decouvrez">Données</a>
            <a href="#about">À propos</a>
          </div>
          <button type="button" className="landing-login">
            Se connecter
          </button>
        </div>
      </nav>

      <section className="landing-hero">
        <span className="landing-eyebrow">Données ouvertes · France</span>
        <h1 className="landing-title">
          Analysez une adresse<br />
          <i>avant de louer ou acheter.</i>
        </h1>
        <p className="landing-lead">
          Transports, risques, cadastre, prix immobiliers, urbanisme. Toutes les informations
          clés sur une adresse française, en quelques secondes.
        </p>
        <div className="landing-search">
          <SearchPanel />
        </div>
        <div className="landing-trust">
          <span><em>·</em> Gratuit</span>
          <span><em>·</em> Sans inscription</span>
          <span><em>·</em> Sources officielles</span>
        </div>
      </section>

      <section className="landing-section" id="decouvrez">
        <div className="section-head">
          <span className="section-num">01</span>
          <h2 className="section-title">
            Ce que vous <i>découvrez</i>
          </h2>
          <span className="section-meta">Six dimensions</span>
        </div>
        <div className="features-grid">
          <article className="feature-card">
            <svg className="feature-ico" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
              <rect x="4" y="4" width="16" height="13" rx="2" />
              <path d="M4 11h16M8 17v2M16 17v2" />
              <circle cx="8" cy="14" r="0.8" fill="currentColor" />
              <circle cx="16" cy="14" r="0.8" fill="currentColor" />
            </svg>
            <h3>Mobilité</h3>
            <p>Bus, métro, RER, gare. Les transports les plus proches et leur distance.</p>
          </article>
          <article className="feature-card">
            <svg className="feature-ico" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
              <path d="M12 3 2 20h20L12 3z" />
              <path d="M12 10v5M12 17.5v0.5" />
            </svg>
            <h3>Risques</h3>
            <p>Inondation, argile, séisme, radon. Risques naturels et technologiques du secteur.</p>
          </article>
          <article className="feature-card">
            <svg className="feature-ico" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
              <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
            </svg>
            <h3>Cadastre &amp; urbanisme</h3>
            <p>Parcelle, zone PLU, prescriptions d&apos;urbanisme. Les règles qui s&apos;appliquent.</p>
          </article>
          <article className="feature-card">
            <svg className="feature-ico" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <path d="M18 7H8a4 4 0 0 0 0 8h10M18 12H6" />
            </svg>
            <h3>Prix immobiliers</h3>
            <p>Transactions récentes à proximité, prix au m², visualisés sur la carte.</p>
          </article>
          <article className="feature-card">
            <svg className="feature-ico" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
              <path d="M12 21c-4-4-7-7-7-12a7 7 0 0 1 14 0c0 5-3 8-7 12z" />
              <path d="M9 9c0 3 1 5 3 7M15 9c0 3-1 5-3 7" />
            </svg>
            <h3>Environnement</h3>
            <p>Qualité de l&apos;air, espaces verts, commerces et services du quotidien.</p>
          </article>
          <article className="feature-card">
            <svg className="feature-ico" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
              <path d="M3 6 9 4l6 2 6-2v14l-6 2-6-2-6 2zM9 4v16M15 6v16" />
            </svg>
            <h3>Carte interactive</h3>
            <p>Couches de risques, parcelle cadastrale et prix superposés sur la carte.</p>
          </article>
        </div>
      </section>

      <section className="landing-section landing-section--alt">
        <div className="section-head">
          <span className="section-num">02</span>
          <h2 className="section-title">
            Comment ça <i>marche</i>
          </h2>
          <span className="section-meta">Trois étapes</span>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-num">01</div>
            <h4>Saisissez l&apos;adresse</h4>
            <p>N&apos;importe quelle adresse française, du studio parisien à la maison en province.</p>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <h4>L&apos;analyse se lance</h4>
            <p>Croisement automatique des bases publiques en quelques secondes.</p>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <h4>Décidez sereinement</h4>
            <p>Carte interactive et indicateurs pour louer ou acheter en connaissance de cause.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          Claire<i>Adresse</i>
        </div>
        <span>Données ouvertes françaises · Gratuit, sans inscription</span>
      </footer>
    </main>
  );
}
