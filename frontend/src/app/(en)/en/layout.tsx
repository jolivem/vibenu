import type { ReactNode } from "react";
import { RootDocument } from "@/components/layout/RootDocument";
import { EnProvider } from "@/i18n/EnProvider";
import { site } from "@/i18n/messages/en/site";
import { rootMetadata } from "@/lib/root-metadata";
import { FEATURES } from "@/lib/site-features";

/**
 * Layout racine de l'anglais : toutes ses pages vivent sous `/en`. Un layout racine par
 * langue rend `<html lang>` exact sans middleware, et garde les pages statiques.
 *
 * Tant que `FEATURES.englishLaunched` est faux, la langue est en ligne mais cachée :
 * non indexable, absente du sitemap, sans sélecteur de langue.
 */
export const metadata = rootMetadata("en", site, FEATURES.englishLaunched);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <RootDocument locale="en" description={site.description}>
      <EnProvider>{children}</EnProvider>
    </RootDocument>
  );
}
