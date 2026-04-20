import type { ReactNode } from "react";
import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "ClaireAdresse — Analysez une adresse avant de louer ou acheter",
  description:
    "Transports, risques, cadastre, prix immobiliers, urbanisme — toutes les informations clés sur une adresse en France, en quelques secondes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
