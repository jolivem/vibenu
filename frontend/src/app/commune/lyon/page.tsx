import { CityHubPage } from "@/components/commune/CityHubPage";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BRANDING, FEATURES } from "@/lib/site-features";

// Rendu serveur à chaque requête (cf. /commune/paris/page.tsx pour la motivation).
export const dynamic = "force-dynamic";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Lyon — Arrondissements, prix immobilier, climat et risques",
  description:
    "Les 9 arrondissements de Lyon comparés : prix au m², population. Climat de Lyon, risques naturels, résultats des municipales 2026. Données publiques officielles.",
  alternates: { canonical: "/commune/lyon" },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: `${SITE_URL}/commune/lyon`,
    title: `Lyon — Les 9 arrondissements analysés · ${BRANDING.name}`,
    description:
      "Prix, population, climat, risques naturels et municipales 2026 — les 9 arrondissements lyonnais et leur ville.",
  },
};

export default async function LyonHubPage() {
  if (!FEATURES.hasSEOPages) notFound();
  return <CityHubPage city="lyon" />;
}
