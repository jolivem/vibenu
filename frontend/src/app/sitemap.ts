import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

import { LOCALES, ROUTES, languageAlternates, type RouteId } from "@/i18n/locales";
import { ALL_COMMUNE_SLUGS, ALL_CITY_SLUGS } from "@/lib/commune-slugs";
import { comparatifPath } from "@/components/commune/comparatifSections";
import { FEATURES } from "@/lib/site-features";

/** Pages traduites et indexables. `/analyze` ne l'est pas : elle dépend d'une adresse. */
const TRANSLATED: Array<{ route: RouteId; changeFrequency: "weekly" | "monthly"; priority: number }> = [
  { route: "home", changeFrequency: "weekly", priority: 1 },
  { route: "about", changeFrequency: "monthly", priority: 0.6 },
];

/**
 * Date de la dernière modification réelle du contenu, à avancer quand un gabarit ou ses
 * données changent. `new Date()` donnait une date neuve à chaque lecture : Google apprend à
 * ignorer un `lastmod` qui change toujours, et ne relisait plus le sitemap depuis mai.
 */
const PAGES_UPDATED = new Date("2026-11-04");
const COMMUNE_PAGES_UPDATED = new Date("2026-11-06");

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
  const absolute = (path: string) => (path === "/" ? siteUrl : `${siteUrl}${path}`);
  const entries: MetadataRoute.Sitemap = [];

  // Une entrée par langue lancée, chacune annonçant ses équivalents (`hreflang`).
  const locales = FEATURES.englishLaunched ? LOCALES : (["fr"] as const);
  for (const { route, changeFrequency, priority } of TRANSLATED) {
    for (const locale of locales) {
      entries.push({
        url: absolute(ROUTES[route][locale]),
        lastModified: PAGES_UPDATED,
        changeFrequency,
        priority: locale === "fr" ? priority : priority * 0.9,
        ...(FEATURES.englishLaunched
          ? {
              alternates: {
                languages: Object.fromEntries(
                  Object.entries(languageAlternates(route)).map(([tag, path]) => [tag, absolute(path)]),
                ),
              },
            }
          : {}),
      });
    }
  }

  // Pages commune : en français seulement, sans équivalent dans les autres langues, et
  // absentes de la variante qui ne les sert pas.
  if (FEATURES.hasSEOPages) {
    for (const commune of ALL_COMMUNE_SLUGS) {
      entries.push({
        url: `${siteUrl}/commune/${commune.slug}`,
        lastModified: COMMUNE_PAGES_UPDATED,
        changeFrequency: "monthly",
        priority: commune.parentSlug === null ? 0.9 : 0.8,
      });
    }
    for (const city of ALL_CITY_SLUGS) {
      entries.push({
        url: `${siteUrl}${comparatifPath(city)}`,
        lastModified: COMMUNE_PAGES_UPDATED,
        changeFrequency: "monthly",
        priority: 0.8,
      });
    }
    entries.push({
      url: `${siteUrl}/commune/methode`,
      lastModified: COMMUNE_PAGES_UPDATED,
      changeFrequency: "yearly",
      priority: 0.3,
    });
  }
  return entries;
}
