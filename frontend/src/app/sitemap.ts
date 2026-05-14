import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

import { ALL_COMMUNE_SLUGS } from "@/lib/commune-slugs";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/a-propos`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
  // Phase 0 SEO programmatique : hub Paris + 20 arrondissements
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
