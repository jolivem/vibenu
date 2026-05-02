import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Manrope, JetBrains_Mono, Fraunces } from "next/font/google";
import "../styles/globals.css";

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const serif = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";
const SITE_NAME = "ClaireAdresse";
const SITE_TITLE = "ClaireAdresse · Analysez une adresse avant de louer ou acheter";
const SITE_DESCRIPTION =
  "Transports, risques, cadastre, prix immobiliers, urbanisme. Toutes les informations clés sur une adresse en France, en quelques secondes.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "analyse adresse",
    "immobilier",
    "prix immobilier",
    "DVF",
    "cadastre",
    "PLU",
    "risques naturels",
    "transports",
    "quartier",
    "France",
  ],
  authors: [{ name: SITE_NAME }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
