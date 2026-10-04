import type { Metadata } from "next";
import { OPEN_GRAPH_LOCALES, languageAlternates, localizedHref, type Locale } from "@/i18n/locales";
import type { SiteMessages } from "@/i18n/messages/fr/site";
import { BRANDING, FEATURES } from "@/lib/site-features";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";

/**
 * Métadonnées du layout racine d'une langue. Chaque page traduite redéfinit son propre
 * `canonical` ; celui-ci est celui de l'accueil.
 *
 * `indexable: false` garde une langue hors des moteurs tant qu'elle n'est pas lancée.
 */
export function rootMetadata(locale: Locale, site: SiteMessages, indexable = true): Metadata {
  const title = `${BRANDING.name} · ${site.tagline}`;
  const home = localizedHref(locale, "home");
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s · ${BRANDING.name}`,
    },
    description: site.description,
    applicationName: BRANDING.name,
    keywords: site.keywords,
    authors: [{ name: BRANDING.name }],
    openGraph: {
      type: "website",
      locale: OPEN_GRAPH_LOCALES[locale],
      url: absoluteUrl(home),
      siteName: BRANDING.name,
      title,
      description: site.description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: site.description,
    },
    alternates: {
      canonical: home,
      // Les autres langues ne sont annoncées qu'une fois lancées.
      ...(FEATURES.englishLaunched ? { languages: languageAlternates("home") } : {}),
    },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        }
      : { index: false, follow: false },
  };
}
