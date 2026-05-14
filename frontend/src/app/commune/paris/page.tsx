import Link from "next/link";
import type { Metadata } from "next";
import { getParisArrondissements } from "@/lib/commune-slugs";
import { getCommuneStatsService } from "@/server-modules/commune-stats/application/commune-stats.service";
import { formatEur, formatInt } from "@/components/commune/format";

export const revalidate = 86400;

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Paris — Tous les arrondissements : prix immobilier, démographie",
  description:
    "Hub Paris : analyse complète des 20 arrondissements. Prix m² médian, démographie, équipements, qualité de l'air. Données publiques officielles.",
  alternates: { canonical: "/commune/paris" },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: `${SITE_URL}/commune/paris`,
    title: "Paris — Les 20 arrondissements analysés · ClaireAdresse",
    description:
      "Comparez prix, démographie et cadre de vie entre les 20 arrondissements parisiens.",
  },
};

interface ArrondissementSummary {
  slug: string;
  codeCommune: string;
  nomCourt: string;
  prixM2Median: number | null;
  populationTotale: number;
}

async function loadSummaries(): Promise<ArrondissementSummary[]> {
  const service = getCommuneStatsService();
  const arrondissements = getParisArrondissements();
  const results = await Promise.allSettled(
    arrondissements.map(async (c) => {
      const stats = await service.getStats(c.codeCommune);
      return {
        slug: c.slug,
        codeCommune: c.codeCommune,
        nomCourt: c.nomCourt,
        prixM2Median: stats.prix.prixM2Median,
        populationTotale: stats.demo.populationTotale,
      };
    }),
  );
  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      slug: arrondissements[i].slug,
      codeCommune: arrondissements[i].codeCommune,
      nomCourt: arrondissements[i].nomCourt,
      prixM2Median: null,
      populationTotale: 0,
    };
  });
}

export default async function ParisHubPage() {
  const summaries = await loadSummaries();
  // Tri par code INSEE : 75101..75120 = arrondissements 1 à 20 dans l'ordre
  const sorted = [...summaries].sort((a, b) => a.codeCommune.localeCompare(b.codeCommune));

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Paris", item: `${SITE_URL}/commune/paris` },
    ],
  };

  return (
    <main className="landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-brand">
            Claire<span>Adresse</span>
          </Link>
          <div className="landing-nav-links">
            <Link href="/">Accueil</Link>
            <Link href="/a-propos">À propos</Link>
          </div>
        </div>
      </nav>

      <section className="commune-hero">
        <span className="landing-eyebrow">Île-de-France · Métropole</span>
        <h1 className="commune-title">Paris &mdash; Les 20 arrondissements</h1>
        <p className="commune-lead">
          Explorez et comparez prix immobilier, démographie et qualité de l&apos;air dans
          les 20 arrondissements de Paris. Toutes les données proviennent de sources
          publiques officielles (DVF, INSEE, AirParif).
        </p>
      </section>

      <section className="commune-section" id="liste">
        <div className="commune-section-head">
          <span className="section-num">01</span>
          <h2 className="commune-section-title">
            Les <i>20 arrondissements</i>
          </h2>
          <span className="section-meta">Cliquez pour analyser</span>
        </div>
        <ul className="commune-hub-list">
          {sorted.map((s) => (
            <li key={s.slug}>
              <Link href={`/commune/${s.slug}`} className="commune-hub-card">
                <span className="commune-hub-name">{s.nomCourt}</span>
                <span className="commune-hub-meta">
                  {s.prixM2Median ? `${formatEur(s.prixM2Median)}/m²` : "—"}
                  {s.populationTotale > 0 ? ` · ${formatInt(s.populationTotale)} hab.` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          Claire<i>Adresse</i>
        </div>
        <span>Données publiques · DVF · INSEE · AirParif</span>
        <div className="landing-footer-links">
          <Link href="/">Analyser une adresse</Link>
          <Link href="/a-propos">À propos</Link>
        </div>
      </footer>
    </main>
  );
}
