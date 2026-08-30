import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FEATURES } from "@/lib/site-features";
import { Brand } from "@/components/Brand";

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
    name: "Recensement & revenus",
    issuer: "INSEE — RP 2021, Filosofi",
    desc: "Population, logement, emploi, diplômes et revenus au niveau de l'IRIS, l'îlot statistique qui découpe les communes en quartiers.",
  },
  {
    name: "Commerces & équipements",
    issuer: "INSEE (BPE) · OpenStreetMap",
    desc: "Écoles, pharmacies, médecins, commerces, parcs et équipements sportifs autour de l'adresse, avec leur distance.",
  },
  {
    name: "Transports",
    issuer: "transport.data.gouv.fr",
    desc: "Arrêts de bus, métro, tramway, RER et gares ferroviaires issus des bases GTFS des autorités organisatrices.",
  },
  {
    name: "Normales climatiques",
    issuer: "Météo-France · meteo.data.gouv.fr",
    desc: "Températures, précipitations et ensoleillement mois par mois sur la période de référence 1991-2020, par station.",
  },
  {
    name: "Qualité de l'air",
    issuer: "Atmo France · LCSQA",
    desc: "Indice quotidien de qualité de l'air et stations de mesure les plus proches.",
  },
  {
    name: "Délinquance enregistrée",
    issuer: "SSMSI · Ministère de l'Intérieur",
    desc: "Faits enregistrés par la police et la gendarmerie sur dix ans, à la maille communale — la plus fine qui soit publiée.",
  },
  {
    name: "Résultats électoraux",
    issuer: "Ministère de l'Intérieur / data.gouv.fr",
    desc: "Municipales 2026 et présidentielle 2022, agrégés à la commune et à l'arrondissement.",
  },
  {
    name: "Cartes anciennes",
    issuer: "IGN · Géoplateforme",
    desc: "Carte de Cassini, carte de l'état-major et photographies aériennes depuis les années 1950.",
  },
  {
    name: "Carte scolaire",
    issuer: "Ville de Paris — opendata.paris.fr",
    desc: "Secteurs de collège, disponibles pour Paris uniquement.",
  },
];

export default function AboutPage() {
  // En PRO, la page /a-propos n'a pas de contenu adapté (copy spécifique
  // ClaireAdresse). On 404 jusqu'à ce qu'un contenu PRO soit rédigé.
  if (!FEATURES.hasAboutPage) notFound();

  return (
    <main className="landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />

      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-brand">
            <Brand />
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
            pour la mobilité, Météo-France pour le climat, le ministère de l&apos;Intérieur pour les
            scrutins. Croiser tout cela avant une visite ou une signature prend des heures.
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
            ceux téléversés par les communes sur le Géoportail de l&apos;Urbanisme. La synthèse
            en tête d&apos;analyse est rédigée automatiquement à partir de ces mêmes chiffres : elle
            les reformule, elle n&apos;en ajoute aucun.
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
          <Brand variant="footer" />
        </div>
        <span>Données ouvertes françaises · Gratuit, sans inscription</span>
        <div className="landing-footer-links">
          <Link href="/">Analyser une adresse</Link>
        </div>
      </footer>
    </main>
  );
}
