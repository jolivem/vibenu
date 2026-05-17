import { CityHubPage } from "@/components/commune/CityHubPage";
import type { Metadata } from "next";

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
    title: "Lyon — Les 9 arrondissements analysés · ClaireAdresse",
    description:
      "Comparez prix, démographie et cadre de vie entre les 9 arrondissements de Lyon.",
  },
};

export default async function LyonHubPage() {
  return <CityHubPage city="lyon" />;
}
