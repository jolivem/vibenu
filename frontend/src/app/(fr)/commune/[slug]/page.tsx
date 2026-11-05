import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ALL_COMMUNE_SLUGS,
  CITIES,
  getCommuneBySlug,
  isCityHubSlug,
  type CommuneSlugEntry,
} from "@/lib/commune-slugs";
import { BRANDING, FEATURES } from "@/lib/site-features";
import { Brand } from "@/components/Brand";
import { getCommuneStatsService } from "@/server-modules/commune-stats/application/commune-stats.service";
import { getCommuneNarrativeService } from "@/server-modules/narrative/application/commune-narrative.service";
import { CommuneContourProvider } from "@/server-modules/address/infrastructure/commune-contour.provider";
import { KeyFigures } from "@/components/analysis/KeyFigures";
import { SectionNav } from "@/components/analysis/SectionNav";
import { CommuneHero } from "@/components/commune/CommuneHero";
import { CommuneLocatorCard } from "@/components/commune/CommuneLocatorCard";
import { CommunePriceCard } from "@/components/commune/CommunePriceCard";
import { RentsCard } from "@/components/analysis/RentsCard";
import { hasRentContent } from "@/components/analysis/rentsModel";
import { rents as rentsMessages } from "@/i18n/messages/fr/analysis/rents";
import { CommuneAgeCard } from "@/components/commune/CommuneAgeCard";
import { CommuneEmploymentCard } from "@/components/commune/CommuneEmploymentCard";
import { CommuneHouseholdsCard } from "@/components/commune/CommuneHouseholdsCard";
import { CommuneHousingCard } from "@/components/commune/CommuneHousingCard";
import { CommuneEquipmentsCard } from "@/components/commune/CommuneEquipmentsCard";
import { CommuneSecurityCard } from "@/components/commune/CommuneSecurityCard";
import { CommuneElectionsCard } from "@/components/commune/CommuneElectionsCard";
import { CommuneNarrativeCard } from "@/components/commune/CommuneNarrativeCard";
import { CommuneHistoryCard } from "@/components/commune/CommuneHistoryCard";
import { buildFaqItems, CommuneFaqSection } from "@/components/commune/CommuneFaqSection";
import { CommuneRelatedLinks } from "@/components/commune/CommuneRelatedLinks";
import { formatEur, formatInt } from "@/components/commune/format";
import {
  chapeau,
  faqPrixRang,
  lignesVoisins,
  loadCityStats,
  phraseRangs,
  rangCourt,
  rangDe,
} from "@/components/commune/cityComparison";
import { buildCommuneKeyFigures } from "@/components/commune/keyFigures";
import {
  COMMUNE_SECTION_TITLES,
  communeSectionContent,
  tronquerPropre,
  type CommuneSectionId,
} from "@/components/commune/sections";
import { communeInseeViews } from "@/components/commune/inseeViews";
import { SITE_URL } from "@/lib/site-url";

export const revalidate = 86400; // 24h ISR
// dynamicParams = true (défaut) : permet la génération à la demande quand la liste
// retournée par generateStaticParams est vide (cas du build Docker sans DB).
// Les slugs invalides sont rejetés par le notFound() ci-dessous.


export async function generateStaticParams() {
  // En variante PRO, pas de pages SEO du tout (notFound dans la page).
  // En PUBLIC : le rendu des pages arrondissement nécessite la DB (stats, narrative,
  // contour). En build Docker, POSTGRES_URL n'est pas disponible → on retourne [] pour
  // skipper le prerender ; les pages sont générées au premier accès au runtime puis
  // cachées 24h via ISR. Quand POSTGRES_URL est présent (build local, Vercel, etc.),
  // on pré-rend la liste complète pour avoir une perf cold-start optimale.
  if (!FEATURES.hasSEOPages) return [];
  if (!process.env.POSTGRES_URL) return [];

  return ALL_COMMUNE_SLUGS
    .filter((c) => !isCityHubSlug(c.slug))
    .map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const commune = getCommuneBySlug(slug);
  if (!commune || isCityHubSlug(commune.slug)) {
    return { title: "Page introuvable" };
  }
  // Une description faite des chiffres qui distinguent l'arrondissement, rang compris : les
  // 45 descriptions ne se ressemblent plus qu'à leurs libellés. Stats en cache 24 h.
  const descParts: string[] = [];
  try {
    const [stats, city] = await Promise.all([
      getCommuneStatsService().getStats(commune.codeCommune),
      loadCityStats(commune.city),
    ]);
    const avecRang = (texte: string, id: Parameters<typeof rangDe>[2]) => {
      const r = rangCourt(rangDe(city, commune.codeCommune, id));
      return r ? `${texte} (${r})` : texte;
    };
    if (stats.prix.prixM2Median) descParts.push(avecRang(`appartement ${formatEur(stats.prix.prixM2Median)}/m²`, "prix"));
    if (stats.demo.revenuMedianPondere) descParts.push(avecRang(`revenu médian ${formatEur(stats.demo.revenuMedianPondere)}`, "revenu"));
    if (stats.demo.populationTotale > 0) descParts.push(`${formatInt(stats.demo.populationTotale)} habitants`);
  } catch {
    // tolérant : si la DB n'est pas dispo, description générique
  }
  const desc = descParts.length > 0
    ? `${commune.nomCourt} : ${descParts.join(", ")}. Prix, loyers, sécurité, population et élections, chiffrés.`
    : `${commune.nomCourt} : prix, loyers, sécurité, population et élections, chiffrés à partir des données publiques.`;

  return {
    // La forme des requêtes vues dans Search Console : « vivre à Marseille 10e », « avis … ».
    title: `Vivre à ${commune.nomCourt} : avis chiffré, prix, loyers, sécurité`,
    description: tronquerPropre(desc, 158),
    alternates: { canonical: `/commune/${commune.slug}` },
    openGraph: {
      type: "article",
      locale: "fr_FR",
      url: `${SITE_URL}/commune/${commune.slug}`,
      title: `${commune.nomAffiche} — ${BRANDING.name}`,
      description: tronquerPropre(desc, 158),
    },
  };
}

/**
 * Une section du corps : son titre, son ancre, et les cards qu'elle contient.
 *
 * Décalque du wrapper de `AnalysisScreen` : l'`id` est l'ancre que visent le sommaire et
 * le bandeau de chiffres clés, et le titre vient de la table — jamais écrit sur place.
 */
function CommuneSection({
  id,
  children,
}: {
  id: CommuneSectionId;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="page-section">
      <h2 className="page-section-title">{COMMUNE_SECTION_TITLES[id]}</h2>
      <div className="page-section-body">{children}</div>
    </section>
  );
}

/**
 * Le rang de l'arrondissement dans sa ville, en tête de section : la seule prose de la page
 * qui ne se lit sur aucune autre (cf. `cityComparison.ts`).
 */
function RankLine({ phrase }: { phrase: string }) {
  if (!phrase) return null;
  return <p className="commune-rank">{phrase}</p>;
}

export default async function CommunePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!FEATURES.hasSEOPages) notFound();

  const { slug } = await params;
  const commune = getCommuneBySlug(slug);
  if (!commune || isCityHubSlug(commune.slug)) {
    notFound();
  }

  const statsService = getCommuneStatsService();
  const narrativeService = getCommuneNarrativeService();
  const contourProvider = new CommuneContourProvider();

  const stats = await statsService.getStats(commune.codeCommune);
  const [narrative, contour, city] = await Promise.all([
    narrativeService.getNarrative({
      codeCommune: commune.codeCommune,
      nomAffiche: commune.nomAffiche,
      stats,
    }),
    contourProvider.getContour(commune.codeCommune),
    loadCityStats(commune.city),
  ]);
  const rangsPrix = phraseRangs(city, commune, ["prix", "loyer"]);
  const rangsPopulation = phraseRangs(city, commune, ["revenu", "population", "chomage", "proprietaires"]);

  // Les légendes voyagent avec la narrative : même appel au modèle, même cache. Une
  // page sans narrative se rend simplement sans légende, comme avant.
  const legendes = narrative?.content.legendes;

  // Les questions servent de garde de section autant que de contenu : construites ici,
  // elles alimentent le balisage `FAQPage` et la liste rendue, qui ne peuvent plus
  // diverger.
  const faqPrix = faqPrixRang(city, commune, stats);
  const faqItems = [...(faqPrix ? [faqPrix] : []), ...buildFaqItems(stats, commune.nomCourt)];
  const inseeViews = communeInseeViews(stats, commune.nomCourt);

  // Le point de décision unique : les cards n'ont plus de garde interne, elles ne sont
  // montées que si leur section a quelque chose à montrer. Sommaire, bandeau et corps
  // lisent tous les trois cette même table.
  const content = communeSectionContent({ stats, contour, nbFaqItems: faqItems.length });
  const activeSections = (Object.keys(COMMUNE_SECTION_TITLES) as CommuneSectionId[]).filter(
    (id) => content[id],
  );
  const navSections = activeSections.map((id) => ({ id, title: COMMUNE_SECTION_TITLES[id] }));
  const keyFigures = buildCommuneKeyFigures(stats, activeSections);

  const placeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: commune.nomAffiche,
    url: `${SITE_URL}/commune/${commune.slug}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: commune.lat,
      longitude: commune.lon,
    },
    ...(commune.parentNom && {
      containedInPlace: { "@type": "Place", name: commune.parentNom },
    }),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      ...(commune.parentSlug
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: commune.parentNom,
              item: `${SITE_URL}/commune/${commune.parentSlug}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: commune.nomAffiche,
              item: `${SITE_URL}/commune/${commune.slug}`,
            },
          ]
        : [
            {
              "@type": "ListItem",
              position: 2,
              name: commune.nomAffiche,
              item: `${SITE_URL}/commune/${commune.slug}`,
            },
          ]),
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
            {commune.parentSlug && (
              <Link href={`/commune/${commune.parentSlug}`}>{commune.parentNom}</Link>
            )}
            {FEATURES.hasAboutPage && <Link href="/a-propos">À propos</Link>}
          </div>
        </div>
      </nav>

      <CommuneHero commune={commune} lead={chapeau(city, commune, stats)} />

      <div className="page-shell">
        <KeyFigures figures={keyFigures} ariaLabel="Chiffres clés" />

        {/* Zone chapeau, hors sommaire : la carte situe ce qui suit, la synthèse
            l'introduit. Ni l'une ni l'autre n'est une rubrique. */}
        <CommuneLocatorCard commune={commune} contour={contour} />
        {narrative && (
          <CommuneNarrativeCard content={narrative.content} nomCourt={commune.nomCourt} />
        )}

        <div className="page-body">
          <aside className="page-sidebar">
            {/* Pas de barre fixe sur cette page, contrairement à l'écran d'analyse. */}
            <SectionNav sections={navSections} topOffset={0} />
          </aside>

          <div className="page-sections">
            {content["prix-immobilier"] && (
              <CommuneSection id="prix-immobilier">
                <RankLine phrase={rangsPrix} />
                {stats.prix.prixM2Median !== null && (
                  <CommunePriceCard stats={stats} nomCourt={commune.nomCourt} legendes={legendes} />
                )}
                {FEATURES.showRents && hasRentContent(stats.loyers) && (
                  <RentsCard
                    rents={stats.loyers}
                    m={rentsMessages}
                    title="Location"
                    benchmark={
                      stats.loyersVille ? { adjectif: CITIES[stats.city].adjectif, values: stats.loyersVille } : null
                    }
                    insight={legendes?.legende_loyers}
                    zoneDetail={false}
                  />
                )}
              </CommuneSection>
            )}

            {content.equipements && (
              <CommuneSection id="equipements">
                <CommuneEquipmentsCard stats={stats} legendes={legendes} />
              </CommuneSection>
            )}

            {/* Même ordre que l'analyse : le cadre de vie, puis la sécurité, puis les gens. */}
            {content.securite && stats.securite && (
              <CommuneSection id="securite">
                <CommuneSecurityCard stats={stats} securite={stats.securite} legendes={legendes} />
              </CommuneSection>
            )}

            {content.demographie && (
              <CommuneSection id="demographie">
                <RankLine phrase={rangsPopulation} />
                <CommuneAgeCard stats={stats} nomCourt={commune.nomCourt} legendes={legendes} />
                {inseeViews.employment && (
                  <CommuneEmploymentCard view={inseeViews.employment} legendes={legendes} />
                )}
                {inseeViews.households && (
                  <CommuneHouseholdsCard view={inseeViews.households} legendes={legendes} />
                )}
                {inseeViews.housing && (
                  <CommuneHousingCard view={inseeViews.housing} legendes={legendes} />
                )}
              </CommuneSection>
            )}

            {content.elections && stats.elections && (
              <CommuneSection id="elections">
                <CommuneElectionsCard
                  stats={stats}
                  elections={stats.elections}
                  legendes={legendes}
                />
              </CommuneSection>
            )}

            {content.histoire && contour && (
              <CommuneSection id="histoire">
                <CommuneHistoryCard commune={commune} contour={contour} />
              </CommuneSection>
            )}

            {content.faq && (
              <CommuneSection id="faq">
                <CommuneFaqSection items={faqItems} />
              </CommuneSection>
            )}
          </div>
        </div>

        <CommuneRelatedLinks commune={commune} voisins={lignesVoisins(city, commune)} />
      </div>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <Brand variant="footer" />
        </div>
        <span>Données publiques · DVF · INSEE · ministère de l&apos;Intérieur</span>
        <div className="landing-footer-links">
          <Link href="/">Analyser une adresse</Link>
          {FEATURES.hasAboutPage && <Link href="/a-propos">À propos</Link>}
        </div>
      </footer>
    </main>
  );
}
