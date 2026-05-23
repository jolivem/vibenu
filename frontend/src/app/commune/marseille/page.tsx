import { CityHubPage } from "@/components/commune/CityHubPage";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BRANDING, FEATURES } from "@/lib/site-features";

// Rendu serveur à chaque requête (cf. /commune/paris/page.tsx pour la motivation).
export const dynamic = "force-dynamic";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Marseille — Tous les arrondissements : prix immobilier, démographie",
  description:
    "Hub Marseille : analyse complète des 16 arrondissements. Prix m² médian, démographie, équipements, qualité de l'air. Données publiques officielles.",
  alternates: { canonical: "/commune/marseille" },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: `${SITE_URL}/commune/marseille`,
    title: `Marseille — Les 16 arrondissements analysés · ${BRANDING.name}`,
    description:
      "Comparez prix, démographie et cadre de vie entre les 16 arrondissements de Marseille.",
  },
};

export default async function MarseilleHubPage() {
  if (!FEATURES.hasSEOPages) notFound();
  return <CityHubPage city="marseille" />;
}
