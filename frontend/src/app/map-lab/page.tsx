import type { Metadata } from "next";
import { BasemapLab } from "@/components/map/BasemapLab";
import "./map-lab.css";

/**
 * Bac à sable V2 — comparaison des fonds de carte candidats.
 * Page interne : jamais indexée, pas de lien depuis le site.
 */
export const metadata: Metadata = {
  title: "Comparateur de fonds de carte",
  robots: { index: false, follow: false },
};

export default function MapLabPage() {
  return <BasemapLab />;
}
