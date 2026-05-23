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
import { CommuneHero } from "@/components/commune/CommuneHero";
import { CommuneMapSection } from "@/components/commune/CommuneMapSection";
import { CommunePriceSection } from "@/components/commune/CommunePriceSection";
import { CommuneDemographicsSection } from "@/components/commune/CommuneDemographicsSection";
import { CommuneEquipmentsSection } from "@/components/commune/CommuneEquipmentsSection";
import { CommuneAirQualitySection } from "@/components/commune/CommuneAirQualitySection";
import { CommuneElectionsSection } from "@/components/commune/CommuneElectionsSection";
import { CommuneNarrativeSection } from "@/components/commune/CommuneNarrativeSection";
import { CommuneFaqSection } from "@/components/commune/CommuneFaqSection";
import { CommuneRelatedLinks } from "@/components/commune/CommuneRelatedLinks";
import { formatEur, formatInt } from "@/components/commune/format";

export const revalidate = 86400; // 24h ISR
// dynamicParams = true (défaut) : permet la génération à la demande quand la liste
// retournée par generateStaticParams est vide (cas du build Docker sans DB).
// Les slugs invalides sont rejetés par le notFound() ci-dessous.

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

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
  // On essaie de récupérer les stats (cached) pour enrichir la description
  let descParts: string[] = [];
  try {
    const stats = await getCommuneStatsService().getStats(commune.codeCommune);
    if (stats.prix.prixM2Median) descParts.push(`${formatEur(stats.prix.prixM2Median)}/m²`);
    if (stats.demo.populationTotale > 0) descParts.push(`${formatInt(stats.demo.populationTotale)} habitants`);
    if (stats.demo.revenuMedianPondere) descParts.push(`${formatEur(stats.demo.revenuMedianPondere)} de revenu médian`);
  } catch {
    // tolérant : si la DB n'est pas dispo, fallback générique
  }
  const desc = descParts.length > 0
    ? `${descParts.join(" · ")}. Analyse complète du ${commune.nomCourt} : prix immobilier, démographie, équipements, qualité de l'air.`
    : `Analyse complète du ${commune.nomCourt} : prix immobilier, démographie, équipements, qualité de l'air. Données publiques.`;

  return {
    title: `${commune.nomAffiche} — Prix immobilier, démographie, cadre de vie`,
    description: desc.slice(0, 158),
    alternates: { canonical: `/commune/${commune.slug}` },
    openGraph: {
      type: "article",
      locale: "fr_FR",
      url: `${SITE_URL}/commune/${commune.slug}`,
      title: `${commune.nomAffiche} — ${BRANDING.name}`,
      description: desc.slice(0, 158),
    },
  };
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
  const [narrative, contour] = await Promise.all([
    narrativeService.getNarrative({
      codeCommune: commune.codeCommune,
      nomAffiche: commune.nomAffiche,
      stats,
    }),
    contourProvider.getContour(commune.codeCommune),
  ]);

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

      <CommuneHero commune={commune} stats={stats} />
      <CommuneMapSection commune={commune} contour={contour} />
      {narrative && <CommuneNarrativeSection content={narrative.content} nomCourt={commune.nomCourt} />}
      <CommunePriceSection stats={stats} nomCourt={commune.nomCourt} />
      <CommuneDemographicsSection stats={stats} nomCourt={commune.nomCourt} />
      <CommuneEquipmentsSection stats={stats} />
      <CommuneAirQualitySection stats={stats} />
      <CommuneElectionsSection stats={stats} />
      <CommuneFaqSection stats={stats} nomCourt={commune.nomCourt} />
      <CommuneRelatedLinks commune={commune} />

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <Brand variant="footer" />
        </div>
        <span>Données publiques · DVF · INSEE · {CITIES[commune.city].airSourceLabel}</span>
        <div className="landing-footer-links">
          <Link href="/">Analyser une adresse</Link>
          {FEATURES.hasAboutPage && <Link href="/a-propos">À propos</Link>}
        </div>
      </footer>
    </main>
  );
}
