import { CityHubPage } from "@/components/commune/CityHubPage";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BRANDING, FEATURES } from "@/lib/site-features";

// Rendu serveur à chaque requête : évite la mise en cache de pages prerendues
// au build Docker (où POSTGRES_URL n'est pas disponible) avec un meta vide.
// Les requêtes lourdes (stats par arrondissement) sont protégées par InMemoryCache
// côté provider, donc le coût runtime reste minimal.
export const dynamic = "force-dynamic";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Paris — Arrondissements, prix immobilier, climat et risques",
  description:
    "Les 20 arrondissements de Paris comparés : prix au m², population. Climat de Paris, risques naturels, résultats des municipales 2026. Données publiques officielles.",
  alternates: { canonical: "/commune/paris" },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: `${SITE_URL}/commune/paris`,
    title: `Paris — Les 20 arrondissements analysés · ${BRANDING.name}`,
    description:
      "Prix, population, climat, risques naturels et municipales 2026 — les 20 arrondissements parisiens et leur ville.",
  },
};

export default async function ParisHubPage() {
  if (!FEATURES.hasSEOPages) notFound();
  return <CityHubPage city="paris" />;
}
