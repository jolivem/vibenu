import Link from "next/link";
import type { Metadata } from "next";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "À propos — La mission de ClaireAdresse",
  description:
    "ClaireAdresse agrège les données publiques françaises (DVF, Géorisques, cadastre, INSEE) pour aider locataires et acheteurs à analyser une adresse avant de s'engager.",
  alternates: {
    canonical: "/a-propos",
  },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: `${SITE_URL}/a-propos`,
    title: "À propos — La mission de ClaireAdresse",
    description:
      "Pourquoi ClaireAdresse existe, quelles données nous utilisons et comment nous garantissons leur fiabilité.",
  },
};

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "À propos de ClaireAdresse",
  url: `${SITE_URL}/a-propos`,
  inLanguage: "fr-FR",
  description:
    "Mission, sources de données et méthodologie du service d'analyse d'adresses ClaireAdresse.",
};

const sources = [
  {
    name: "DVF",
    issuer: "DGFiP / data.gouv.fr",
    desc: "Demandes de Valeurs Foncières — toutes les transactions immobilières enregistrées en France depuis 2014.",
  },
  {
    name: "Géorisques",
    issuer: "BRGM · Ministère de la Transition écologique",
    desc: "Risques naturels et technologiques : inondation, retrait-gonflement des argiles, séisme, radon, sites industriels.",
  },
  {
    name: "Cadastre & GPU",
    issuer: "IGN · Ministère du Logement",
    desc: "Parcelles cadastrales et zonages d'urbanisme (PLU, PLUi, cartes communales) consultables sur le Géoportail de l'Urbanisme.",
  },
  {
    name: "INSEE IRIS",
    issuer: "INSEE",
    desc: "Données démographiques et socio-économiques au niveau des îlots regroupés pour l'information statistique.",
  },
  {
    name: "Transports",
    issuer: "transport.data.gouv.fr",
    desc: "Arrêts de bus, métro, tramway, RER et gares ferroviaires issus des bases GTFS des autorités organisatrices.",
  },
  {
    name: "Qualité de l'air",
    issuer: "Atmo France · LCSQA",
    desc: "Indicateurs de qualité de l'air et stations de mesure les plus proches.",
  },
];

export default function AboutPage() {
  return (
    <main className="landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />

      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-brand">
            Claire<span>Adresse</span>
          </Link>
          <div className="landing-nav-links">
            <Link href="/#decouvrez">Comment ça marche</Link>
            <Link href="/#faq">Questions</Link>
            <Link href="/a-propos" aria-current="page">À propos</Link>
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <span className="landing-eyebrow">À propos</span>
        <h1 className="landing-title">
          La donnée publique,<br />
          <i>lisible par tous.</i>
        </h1>
        <p className="landing-lead">
          ClaireAdresse rassemble en un seul écran les informations dispersées entre une douzaine
          de bases publiques françaises. Notre objectif : permettre à toute personne qui s&apos;apprête
          à louer ou acheter de comprendre un quartier en quelques secondes, sans naviguer entre
          dix sites administratifs.
        </p>
      </section>

      <section className="landing-section" id="mission">
        <div className="section-head">
          <span className="section-num">01</span>
          <h2 className="section-title">
            Notre <i>mission</i>
          </h2>
          <span className="section-meta">Pourquoi ce service</span>
        </div>
        <div className="about-prose">
          <p>
            L&apos;information sur les logements existe — elle est même publique. Mais elle reste
            fragmentée entre Géorisques pour les risques naturels, DVF pour les prix, le Géoportail
            de l&apos;Urbanisme pour le PLU, l&apos;INSEE pour la démographie, transport.data.gouv.fr
            pour la mobilité. Croiser tout cela avant une visite ou une signature prend des heures.
          </p>
          <p>
            ClaireAdresse fait ce travail à votre place. Vous saisissez une adresse, nous interrogeons
            les sources officielles et nous présentons une synthèse claire sur une carte. Le service
            est gratuit, sans inscription et utilisable depuis n&apos;importe quel navigateur.
          </p>
        </div>
      </section>

      <section className="landing-section landing-section--alt" id="sources">
        <div className="section-head">
          <span className="section-num">02</span>
          <h2 className="section-title">
            Nos <i>sources</i>
          </h2>
          <span className="section-meta">Données ouvertes</span>
        </div>
        <div className="about-sources">
          {sources.map((s) => (
            <article key={s.name} className="about-source">
              <h3>{s.name}</h3>
              <span className="about-source-issuer">{s.issuer}</span>
              <p>{s.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="methodologie">
        <div className="section-head">
          <span className="section-num">03</span>
          <h2 className="section-title">
            Notre <i>méthodologie</i>
          </h2>
          <span className="section-meta">Comment nous traitons la donnée</span>
        </div>
        <div className="about-prose">
          <p>
            Nous ne réinventons pas la donnée : nous la relayons. Chaque indicateur affiché renvoie
            à une source officielle vérifiable. Les prix au m² proviennent uniquement de
            transactions réelles enregistrées chez les notaires (DVF). Les risques sont ceux
            publiés par les services de l&apos;État. Les zonages d&apos;urbanisme correspondent à
            ceux téléversés par les communes sur le Géoportail de l&apos;Urbanisme.
          </p>
          <p>
            Nous indiquons systématiquement la date de mise à jour de chaque source. Lorsque la
            donnée n&apos;est pas disponible pour une adresse (commune n&apos;ayant pas encore
            publié son PLU, transactions DVF rares en zone peu dense), nous le signalons plutôt que
            de masquer l&apos;information.
          </p>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          Claire<i>Adresse</i>
        </div>
        <span>Données ouvertes françaises · Gratuit, sans inscription</span>
        <div className="landing-footer-links">
          <Link href="/">Analyser une adresse</Link>
        </div>
      </footer>
    </main>
  );
}
