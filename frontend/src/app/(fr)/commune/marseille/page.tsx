import { CityHubPage } from "@/components/commune/CityHubPage";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BRANDING, FEATURES } from "@/lib/site-features";

// Rendu serveur à chaque requête (cf. /commune/paris/page.tsx pour la motivation).
export const dynamic = "force-dynamic";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Marseille — Arrondissements, prix immobilier, climat et risques",
  description:
    "Les 16 arrondissements de Marseille comparés : prix au m², population. Climat, risques naturels, municipales 2026. Données publiques.",
  alternates: { canonical: "/commune/marseille" },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: `${SITE_URL}/commune/marseille`,
    title: `Marseille — Les 16 arrondissements analysés · ${BRANDING.name}`,
    description:
      "Prix, population, climat, risques naturels et municipales 2026 — les 16 arrondissements marseillais et leur ville.",
  },
};

export default async function MarseilleHubPage() {
  if (!FEATURES.hasSEOPages) notFound();
  return <CityHubPage city="marseille" />;
}
