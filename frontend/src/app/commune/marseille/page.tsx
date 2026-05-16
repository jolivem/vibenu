import { CityHubPage } from "@/components/commune/CityHubPage";
import type { Metadata } from "next";

export const revalidate = 86400;

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
    title: "Marseille — Les 16 arrondissements analysés · ClaireAdresse",
    description:
      "Comparez prix, démographie et cadre de vie entre les 16 arrondissements de Marseille.",
  },
};

export default async function MarseilleHubPage() {
  return <CityHubPage city="marseille" />;
}
