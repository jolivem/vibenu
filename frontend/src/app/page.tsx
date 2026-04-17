import { SearchPanel } from "@/components/search/SearchPanel";

export default function HomePage() {
  return (
    <main className="landing">
      <section className="landing-hero">
        <div className="landing-hero-content">
          <span className="landing-brand">ClairImmo</span>
          <h1 className="landing-title">
            Analysez une adresse<br />
            <span className="landing-title-accent">avant de louer ou acheter</span>
          </h1>
          <p className="landing-subtitle">
            Transports, risques, cadastre, prix immobiliers, urbanisme — toutes les informations
            clés sur une adresse en France, en quelques secondes.
          </p>
          <SearchPanel />
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-features-grid">
          <div className="feature-card">
            <span className="feature-icon">&#128652;</span>
            <h3>Mobilit&eacute;</h3>
            <p>Bus, m&eacute;tro, RER, gare &mdash; les transports les plus proches et leur distance.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">&#9888;&#65039;</span>
            <h3>Risques</h3>
            <p>Inondation, argile, s&eacute;isme, radon &mdash; les risques naturels et technologiques du secteur.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">&#127968;</span>
            <h3>Cadastre &amp; urbanisme</h3>
            <p>Parcelle, zone PLU, prescriptions d&apos;urbanisme &mdash; les r&egrave;gles qui s&apos;appliquent.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">&#128176;</span>
            <h3>Prix immobiliers</h3>
            <p>Transactions r&eacute;centes &agrave; proximit&eacute;, prix au m&sup2; &mdash; visualis&eacute;s sur la carte.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">&#127793;</span>
            <h3>Environnement</h3>
            <p>Qualit&eacute; de l&apos;air, espaces verts, commerces et services du quotidien.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">&#128506;</span>
            <h3>Carte interactive</h3>
            <p>Couches de risques, parcelle cadastrale et prix superpos&eacute;s sur la carte.</p>
          </div>
        </div>
      </section>

      <section className="landing-how">
        <h2>Comment &ccedil;a marche</h2>
        <div className="how-steps">
          <div className="how-step">
            <span className="how-step-number">1</span>
            <p>Saisissez une adresse</p>
          </div>
          <div className="how-step-arrow">&rarr;</div>
          <div className="how-step">
            <span className="how-step-number">2</span>
            <p>L&apos;analyse se lance automatiquement</p>
          </div>
          <div className="how-step-arrow">&rarr;</div>
          <div className="how-step">
            <span className="how-step-number">3</span>
            <p>Consultez la carte et les indicateurs</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>ClairImmo &mdash; Donn&eacute;es ouvertes fran&ccedil;aises. Gratuit, sans inscription.</p>
      </footer>
    </main>
  );
}
