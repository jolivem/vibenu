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
import { ClimateServiceImpl } from "@/server-modules/climate/application/climate.service.impl";
import { MeteoFranceStationsProvider } from "@/server-modules/climate/infrastructure/meteo-france-stations.provider";
import { RiskServiceImpl } from "@/server-modules/risks/application/risk.service.impl";
import { GeorisquesRiskProvider } from "@/server-modules/risks/infrastructure/brgm-risk.provider";
import { MunicipalesDatabaseProvider } from "@/server-modules/elections/infrastructure/municipales-database.provider";
import { hasClimateSeries } from "@/components/analysis/ClimateCard";
import { KeyFigures, type KeyFigure } from "@/components/analysis/KeyFigures";
import { SectionNav } from "@/components/analysis/SectionNav";
import { CityHubClimateCard } from "./CityHubClimateCard";
import { CityHubMunicipalesCard } from "./CityHubMunicipalesCard";
import { CityHubRisksCard } from "./CityHubRisksCard";
import { CommuneFaqSection } from "./CommuneFaqSection";
import { buildHubFaqItems } from "./hubFaq";
import {
  CITY_HUB_SECTION_ORDER,
  CITY_HUB_SECTION_TITLES,
  cityHubSectionContent,
  type CityHubSectionId,
} from "./hubSections";

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

/**
 * Une source du hub qui échoue ne doit pas emporter la page : même discipline que
 * `loadSummaries`, qui passe déjà par `allSettled`.
 */
async function safely<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    console.warn("Source de hub indisponible :", error);
    return null;
  }
}

/**
 * Une section du corps : son titre, son ancre, et les cards qu'elle contient.
 *
 * Jumeau du wrapper des pages d'arrondissement, volontairement dupliqué plutôt que
 * généralisé : cinq lignes valent mieux qu'un couplage entre deux pages dont les
 * taxonomies doivent rester séparées.
 */
function HubSection({
  id,
  children,
}: {
  id: CityHubSectionId;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="page-section">
      <h2 className="page-section-title">{CITY_HUB_SECTION_TITLES[id]}</h2>
      <div className="page-section-body">{children}</div>
    </section>
  );
}

interface Props {
  city: City;
}

export async function CityHubPage({ city }: Props) {
  const cityDef = CITIES[city];

  // `commune-stats` n'est jamais interrogé sur un code de ville : `insee_aggregate` n'a
  // pas de ligne pour 75056, 69123 ni 13055 — ses scopes sont les arrondissements. Les
  // chiffres du hub se dérivent donc de ses arrondissements.
  const [summaries, climate, risks, municipales] = await Promise.all([
    loadSummaries(city),
    safely(() =>
      new ClimateServiceImpl(new MeteoFranceStationsProvider()).getClimateData(
        cityDef.lat,
        cityDef.lon,
      ),
    ),
    safely(() =>
      new RiskServiceImpl(new GeorisquesRiskProvider()).getRiskData(
        cityDef.lat,
        cityDef.lon,
        "commune",
      ),
    ),
    safely(() => new MunicipalesDatabaseProvider().getResults(cityDef.codeCommune)),
  ]);
  // Tri par code INSEE = ordre des arrondissements
  const sorted = [...summaries].sort((a, b) =>
    a.codeCommune.localeCompare(b.codeCommune),
  );

  const faqItems = buildHubFaqItems({
    cityDef,
    arrondissements: summaries,
    municipales,
    climate,
    risks,
  });

  const content = cityHubSectionContent({
    nbArrondissements: sorted.length,
    municipales,
    climate,
    risks,
    nbFaqItems: faqItems.length,
    climatMesure: climate?.monthly ? hasClimateSeries(climate.monthly) : false,
  });
  const activeSections = CITY_HUB_SECTION_ORDER.filter((id) => content[id]);
  const navSections = activeSections.map((id) => ({
    id,
    title: CITY_HUB_SECTION_TITLES[id],
  }));

  const prixConnus = sorted.filter((a) => a.prixM2Median !== null && a.prixM2Median > 0);
  const population = sorted.reduce((sum, a) => sum + a.populationTotale, 0);
  const figures: Array<KeyFigure<CityHubSectionId>> = [];
  if (prixConnus.length > 0) {
    // La médiane des médianes d'arrondissement : une approximation assumée, mais le seul
    // prix de ville calculable sans interroger DVF une fois de plus.
    const tries = [...prixConnus].sort((a, b) => a.prixM2Median! - b.prixM2Median!);
    const mediane = tries[Math.floor(tries.length / 2)].prixM2Median!;
    figures.push({
      section: "liste",
      label: "Prix médian",
      value: `${formatEur(mediane)}/m²`,
    });
  }
  if (population > 0) {
    figures.push({ section: "liste", label: "Population", value: formatInt(population) });
  }
  if (content.municipales && municipales) {
    figures.push({
      section: "municipales",
      label: "Participation",
      value: `${municipales.participationPct.toFixed(1).replace(".", ",")} %`,
    });
  }
  if (content.climat && climate?.temperatureC !== null && climate?.temperatureC !== undefined) {
    figures.push({
      section: "climat",
      label: "Température moyenne",
      value: `${climate.temperatureC.toFixed(1).replace(".", ",")} °C`,
    });
  }

  const placeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: cityDef.nomAffiche,
    url: `${SITE_URL}/commune/${city}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: cityDef.lat,
      longitude: cityDef.lon,
    },
  };

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
      />
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
          Retrouvez aussi le climat de la ville, les risques naturels qui la concernent et
          les résultats des municipales 2026. Toutes les données proviennent de sources
          publiques officielles (DVF, INSEE, Météo-France, Géorisques,{" "}
          {cityDef.airSourceLabel}).
        </p>
      </section>

      <div className="page-shell">
        <KeyFigures figures={figures} />

        <div className="page-body">
          <aside className="page-sidebar">
            {/* Pas de barre fixe sur cette page, contrairement à l'écran d'analyse. */}
            <SectionNav sections={navSections} topOffset={0} />
          </aside>

          <div className="page-sections">
            {content.liste && (
              <HubSection id="liste">
                <section className="card">
                  <h2>
                    Les {cityDef.nbArrondissements} arrondissements de{" "}
                    {cityDef.nomAffiche}, comparés
                  </h2>
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
                  <p className="elections-footnote">
                    Prix médian au m² sur 24 mois (DVF) et population (INSEE, données IRIS
                    agrégées). Cliquez un arrondissement pour sa fiche détaillée.
                  </p>
                </section>
              </HubSection>
            )}

            {content.municipales && municipales && (
              <HubSection id="municipales">
                <CityHubMunicipalesCard
                  municipales={municipales}
                  nomAffiche={cityDef.nomAffiche}
                />
              </HubSection>
            )}

            {content.climat && climate && (
              <HubSection id="climat">
                <CityHubClimateCard climate={climate} nomAffiche={cityDef.nomAffiche} />
              </HubSection>
            )}

            {content.risques && risks && (
              <HubSection id="risques">
                <CityHubRisksCard risks={risks} nomAffiche={cityDef.nomAffiche} />
              </HubSection>
            )}

            {content.faq && (
              <HubSection id="faq">
                <CommuneFaqSection items={faqItems} />
              </HubSection>
            )}
          </div>
        </div>
      </div>

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
