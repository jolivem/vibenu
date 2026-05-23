import Link from "next/link";
import {
  CITIES,
  getArrondissementsByCity,
  type City,
} from "@/lib/commune-slugs";
import { getCommuneStatsService } from "@/server-modules/commune-stats/application/commune-stats.service";
import { formatEur, formatInt } from "@/components/commune/format";
import { Brand } from "@/components/Brand";
import { FEATURES } from "@/lib/site-features";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

interface ArrondissementSummary {
  slug: string;
  codeCommune: string;
  nomCourt: string;
  prixM2Median: number | null;
  populationTotale: number;
}

async function loadSummaries(city: City): Promise<ArrondissementSummary[]> {
  const service = getCommuneStatsService();
  const arrondissements = getArrondissementsByCity(city);
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
  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          slug: arrondissements[i].slug,
          codeCommune: arrondissements[i].codeCommune,
          nomCourt: arrondissements[i].nomCourt,
          prixM2Median: null,
          populationTotale: 0,
        },
  );
}

interface Props {
  city: City;
}

export async function CityHubPage({ city }: Props) {
  const cityDef = CITIES[city];
  const summaries = await loadSummaries(city);
  // Tri par code INSEE = ordre des arrondissements
  const sorted = [...summaries].sort((a, b) =>
    a.codeCommune.localeCompare(b.codeCommune),
  );

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: cityDef.nomAffiche,
        item: `${SITE_URL}/commune/${city}`,
      },
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
            <Brand />
          </Link>
          <div className="landing-nav-links">
            <Link href="/">Accueil</Link>
            {FEATURES.hasAboutPage && <Link href="/a-propos">À propos</Link>}
          </div>
        </div>
      </nav>

      <section className="commune-hero">
        <span className="landing-eyebrow">{cityDef.region}</span>
        <h1 className="commune-title">
          {cityDef.nomAffiche} &mdash; Les {cityDef.nbArrondissements} arrondissements
        </h1>
        <p className="commune-lead">
          Explorez et comparez prix immobilier, démographie et qualité de l&apos;air
          dans les {cityDef.nbArrondissements} arrondissements de {cityDef.nomAffiche}.
          Toutes les données proviennent de sources publiques officielles (DVF, INSEE,
          {" "}
          {cityDef.airSourceLabel}).
        </p>
      </section>

      <section className="commune-section" id="liste">
        <div className="commune-section-head">
          <span className="section-num">01</span>
          <h2 className="commune-section-title">
            Les <i>{cityDef.nbArrondissements} arrondissements</i>
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
                  {s.populationTotale > 0
                    ? ` · ${formatInt(s.populationTotale)} hab.`
                    : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <Brand variant="footer" />
        </div>
        <span>Données publiques · DVF · INSEE · {cityDef.airSourceLabel}</span>
        <div className="landing-footer-links">
          <Link href="/">Analyser une adresse</Link>
          {FEATURES.hasAboutPage && <Link href="/a-propos">À propos</Link>}
        </div>
      </footer>
    </main>
  );
}
