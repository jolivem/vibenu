import type { ReactNode } from "react";
import { Manrope, JetBrains_Mono, Fraunces } from "next/font/google";
import "@/styles/globals.css";
import { LOCALE_TAGS, localizedHref, type Locale } from "@/i18n/locales";
import { BRANDING } from "@/lib/site-features";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const serif = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
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
    <html lang={locale} className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
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
