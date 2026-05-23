import { CityHubPage } from "@/components/commune/CityHubPage";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BRANDING, FEATURES } from "@/lib/site-features";

// Rendu serveur à chaque requête (cf. /commune/paris/page.tsx pour la motivation).
export const dynamic = "force-dynamic";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Lyon — Tous les arrondissements : prix immobilier, démographie",
  description:
    "Hub Lyon : analyse complète des 9 arrondissements. Prix m² médian, démographie, équipements, qualité de l'air. Données publiques officielles.",
  alternates: { canonical: "/commune/lyon" },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: `${SITE_URL}/commune/lyon`,
    title: `Lyon — Les 9 arrondissements analysés · ${BRANDING.name}`,
    description:
      "Comparez prix, démographie et cadre de vie entre les 9 arrondissements de Lyon.",
  },
};

export default async function LyonHubPage() {
  if (!FEATURES.hasSEOPages) notFound();
  return <CityHubPage city="lyon" />;
}
