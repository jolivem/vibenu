import Link from "next/link";
import { SearchPanel } from "@/components/search/SearchPanel";
import { Brand } from "@/components/Brand";
import { BRANDING, FEATURES } from "@/lib/site-features";
import { FEATURES_COUNT_LABEL, LANDING_FEATURES } from "@/components/landing/features";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

const faqItems = [
  {
    question: `${BRANDING.name} est-il gratuit ?`,
    answer:
      "Oui. L'analyse d'une adresse française est entièrement gratuite et sans inscription. Le service s'appuie sur des données publiques ouvertes.",
  },
  {
    question: "D'où viennent les données affichées ?",
    answer:
      "Toutes les informations proviennent de sources publiques officielles : DVF (DGFiP) pour les prix immobiliers, Géorisques pour les risques, le cadastre et le Géoportail de l'Urbanisme pour les parcelles et le PLU, l'INSEE pour la population et les logements, transport.data.gouv.fr pour les transports, Météo-France pour le climat, Atmo pour la qualité de l'air, le SSMSI pour la délinquance, le ministère de l'Intérieur pour les élections et l'IGN pour les cartes anciennes. Chaque chiffre reste rattaché à sa source et à sa date de publication.",
  },
  {
    question: "Quelles adresses puis-je analyser ?",
    answer:
      "N'importe quelle adresse située en France métropolitaine et dans les départements et régions d'outre-mer, du studio parisien à la maison en province.",
  },
  {
    question: "Combien de temps prend une analyse ?",
    answer:
      `Quelques secondes. ${BRANDING.name} interroge en parallèle les bases publiques et agrège les résultats sur une carte interactive.`,
  },
  {
    question: "Les prix au m² sont-ils fiables ?",
    answer:
      "Les prix proviennent de la base DVF (Demandes de Valeurs Foncières) publiée par l'État, qui recense les transactions immobilières réelles enregistrées chez les notaires. Les chiffres correspondent à des ventes effectivement réalisées.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: BRANDING.name,
  url: SITE_URL,
  applicationCategory: "RealEstateApplication",
  operatingSystem: "Web",
  description: BRANDING.description,
  inLanguage: "fr-FR",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
  // Dérivé des cards visibles : les deux listes décrivaient les mêmes rubriques sans
  // lien entre elles, et avaient fini par diverger.
  featureList: LANDING_FEATURES.map((f) => f.schemaLabel),
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

export default function HomePage() {
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
          <Link href="/" className="landing-brand">
            <Brand />
          </Link>
          <div className="landing-nav-links">
            {FEATURES.hasLandingMarketingSections && <a href="#decouvrez">Comment ça marche</a>}
            {FEATURES.hasLandingExploreSection && <a href="#explorer">Explorer par commune</a>}
            {FEATURES.hasLandingFaqSection && <a href="#faq">Questions</a>}
            {FEATURES.hasAboutPage && <Link href="/a-propos">À propos</Link>}
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <span className="landing-eyebrow">Données ouvertes · France</span>
        <h1 className="landing-title">
          {BRANDING.heroTitle}<br />
          <i>{BRANDING.heroEmphasis}</i>
        </h1>
        <p className="landing-lead">{BRANDING.description}</p>
        <div className="landing-search">
          <SearchPanel />
        </div>
        <div className="landing-trust">
          <span><em>·</em> Gratuit</span>
          <span><em>·</em> Sans inscription</span>
          <span><em>·</em> Sources officielles</span>
        </div>
      </section>

      {FEATURES.hasLandingMarketingSections && (
      <>
      <section className="landing-section" id="decouvrez">
        <div className="section-head">
          <span className="section-num">01</span>
          <h2 className="section-title">
            Ce que vous <i>découvrez</i>
          </h2>
          <span className="section-meta">{FEATURES_COUNT_LABEL}</span>
        </div>
        <div className="features-grid">
          {LANDING_FEATURES.map((feature) => (
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
      </>
      )}

      {FEATURES.hasLandingExploreSection && (
      <section className="landing-section" id="explorer">
        <div className="section-head">
          <span className="section-num">03</span>
          <h2 className="section-title">
            Explorer par <i>commune</i>
          </h2>
          <span className="section-meta">Pages dédiées · données agrégées</span>
        </div>
        <div className="explore-grid">
          <Link href="/commune/paris" className="explore-card explore-card--featured">
            <div className="explore-card-head">
              <span className="explore-card-eyebrow">Île-de-France</span>
              <h3>Paris</h3>
            </div>
            <p>
              Les 20 arrondissements analysés : prix immobilier, démographie, équipements,
              qualité de l&apos;air et résultats électoraux.
            </p>
            <span className="explore-card-cta">Découvrir les 20 arrondissements →</span>
          </Link>
          <Link href="/commune/lyon" className="explore-card">
            <div className="explore-card-head">
              <span className="explore-card-eyebrow">Auvergne-Rhône-Alpes</span>
              <h3>Lyon</h3>
            </div>
            <p>Les 9 arrondissements analysés : prix, démographie, équipements, qualité de l&apos;air.</p>
            <span className="explore-card-cta">Découvrir les 9 arrondissements →</span>
          </Link>
          <Link href="/commune/marseille" className="explore-card">
            <div className="explore-card-head">
              <span className="explore-card-eyebrow">Provence-Alpes-Côte d&apos;Azur</span>
              <h3>Marseille</h3>
            </div>
            <p>Les 16 arrondissements analysés : prix, démographie, équipements, qualité de l&apos;air.</p>
            <span className="explore-card-cta">Découvrir les 16 arrondissements →</span>
          </Link>
          <div className="explore-card explore-card--soon">
            <div className="explore-card-head">
              <span className="explore-card-eyebrow">Bientôt</span>
              <h3>Top 500 communes</h3>
            </div>
            <p>Toutes les villes françaises de plus de 20 000 habitants.</p>
            <span className="explore-card-cta is-muted">En préparation</span>
          </div>
        </div>
      </section>
      )}

      {FEATURES.hasLandingFaqSection && (
      <section className="landing-section landing-section--alt" id="faq">
        <div className="section-head">
          <span className="section-num">04</span>
          <h2 className="section-title">
            Questions <i>fréquentes</i>
          </h2>
          <span className="section-meta">À propos du service</span>
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
        <span>Données ouvertes françaises · Gratuit, sans inscription</span>
        <div className="landing-footer-links">
          {FEATURES.hasLandingExploreSection && <a href="#explorer">Explorer par commune</a>}
          {FEATURES.hasAboutPage && <Link href="/a-propos">À propos</Link>}
        </div>
      </footer>
    </main>
  );
}
