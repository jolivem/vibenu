import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

import { LOCALES, ROUTES, languageAlternates, type RouteId } from "@/i18n/locales";
import { ALL_COMMUNE_SLUGS } from "@/lib/commune-slugs";
import { FEATURES } from "@/lib/site-features";

/** Pages traduites et indexables. `/analyze` ne l'est pas : elle dépend d'une adresse. */
const TRANSLATED: Array<{ route: RouteId; changeFrequency: "weekly" | "monthly"; priority: number }> = [
  { route: "home", changeFrequency: "weekly", priority: 1 },
  { route: "about", changeFrequency: "monthly", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
  const absolute = (path: string) => (path === "/" ? siteUrl : `${siteUrl}${path}`);
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // Une entrée par langue lancée, chacune annonçant ses équivalents (`hreflang`).
  const locales = FEATURES.englishLaunched ? LOCALES : (["fr"] as const);
  for (const { route, changeFrequency, priority } of TRANSLATED) {
    for (const locale of locales) {
      entries.push({
        url: absolute(ROUTES[route][locale]),
        lastModified: now,
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

  // Pages commune : en français seulement, sans équivalent dans les autres langues.
  for (const commune of ALL_COMMUNE_SLUGS) {
    entries.push({
      url: `${siteUrl}/commune/${commune.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: commune.parentSlug === null ? 0.9 : 0.8,
    });
  }
  return entries;
}
