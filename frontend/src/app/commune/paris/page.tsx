import { CityHubPage } from "@/components/commune/CityHubPage";
import type { Metadata } from "next";

// Rendu serveur à chaque requête : évite la mise en cache de pages prerendues
// au build Docker (où POSTGRES_URL n'est pas disponible) avec un meta vide.
// Les requêtes lourdes (stats par arrondissement) sont protégées par InMemoryCache
// côté provider, donc le coût runtime reste minimal.
export const dynamic = "force-dynamic";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Paris — Tous les arrondissements : prix immobilier, démographie",
  description:
    "Hub Paris : analyse complète des 20 arrondissements. Prix m² médian, démographie, équipements, qualité de l'air. Données publiques officielles.",
  alternates: { canonical: "/commune/paris" },
  openGraph: {
    type: "article",
    locale: "fr_FR",
    url: `${SITE_URL}/commune/paris`,
    title: "Paris — Les 20 arrondissements analysés · ClaireAdresse",
    description:
      "Comparez prix, démographie et cadre de vie entre les 20 arrondissements parisiens.",
  },
};

export default async function ParisHubPage() {
  return <CityHubPage city="paris" />;
}
