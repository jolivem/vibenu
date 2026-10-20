import type { ReactNode } from "react";
import localFont from "next/font/local";
import "@/styles/globals.css";
import { LOCALE_TAGS, localizedHref, type Locale } from "@/i18n/locales";
import { BRANDING } from "@/lib/site-features";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";

/*
 * Polices auto-hébergées (`src/fonts/`, licence SIL OFL 1.1) plutôt que `next/font/google` :
 * celui-ci télécharge les fichiers pendant `next build`, et une connexion lente vers Google
 * Fonts suffisait à faire échouer le build Docker. Ce sont les mêmes fichiers que servait
 * Google pour le sous-ensemble latin — Manrope variable (200 à 800), Fraunces variable,
 * droit et italique, utilisé en 400 et 500.
 */
const manrope = localFont({
  src: "../../fonts/manrope-latin.woff2",
  weight: "200 800",
  variable: "--font-sans",
  display: "swap",
});
const fraunces = localFont({
  src: [
    { path: "../../fonts/fraunces-latin.woff2", weight: "400 500", style: "normal" },
    { path: "../../fonts/fraunces-italic-latin.woff2", weight: "400 500", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const UMAMI_SRC = process.env.NEXT_PUBLIC_UMAMI_SRC;
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

/**
 * Le document HTML, commun aux layouts racine de chaque langue (`app/(fr)`, `app/(en)/en`).
 *
 * Chaque langue a son propre layout racine pour que `<html lang>` soit exact sans
 * middleware ; ce qu'ils partagent — polices, feuille de style, données structurées,
 * mesure d'audience — vit ici.
 */
export function RootDocument({
  locale,
  description,
  children,
}: {
  locale: Locale;
  /** Description du site dans la langue, pour les données structurées. */
  description: string;
  children: ReactNode;
}) {
  const home = absoluteUrl(localizedHref(locale, "home"));

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRANDING.name,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    description,
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRANDING.name,
    url: home,
    inLanguage: LOCALE_TAGS[locale],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${home}${home.endsWith("/") ? "" : "/"}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang={locale} className={`${manrope.variable} ${fraunces.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {UMAMI_SRC && UMAMI_WEBSITE_ID && (
          <script defer src={UMAMI_SRC} data-website-id={UMAMI_WEBSITE_ID} />
        )}
        {children}
      </body>
    </html>
  );
}
