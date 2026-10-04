import type { ReactNode } from "react";
import { RootDocument } from "@/components/layout/RootDocument";
import { FrProvider } from "@/i18n/FrProvider";
import { site } from "@/i18n/messages/fr/site";
import { rootMetadata } from "@/lib/root-metadata";

/**
 * Layout racine du français, langue d'origine du site : ses URL n'ont pas de préfixe. Le
 * groupe de routes `(fr)` n'apparaît pas dans l'URL ; les pages `/commune/*`, qui
 * n'existent qu'en français, y vivent aussi.
 */
export const metadata = rootMetadata("fr", site);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <RootDocument locale="fr" description={site.description}>
      <FrProvider>{children}</FrProvider>
    </RootDocument>
  );
}
