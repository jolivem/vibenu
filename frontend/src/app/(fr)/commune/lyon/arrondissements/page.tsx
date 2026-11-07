import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CityComparisonPage, comparatifMetadata } from "@/components/commune/CityComparisonPage";
import { FEATURES } from "@/lib/site-features";

// Comme le hub : rendu à la requête, l'image Docker est construite sans base de données.
// Les stats d'arrondissement sont en cache 24 h côté provider.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  if (!FEATURES.hasSEOPages) return {};
  return comparatifMetadata("lyon");
}

export default async function LyonComparatifPage() {
  if (!FEATURES.hasSEOPages) notFound();
  return <CityComparisonPage city="lyon" />;
}
