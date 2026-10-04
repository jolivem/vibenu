"use client";

import { useI18n } from "@/i18n/client";
import { LOCALES, LOCALE_NAMES, LOCALE_TAGS, localizedHref, type RouteId } from "@/i18n/locales";
import { FEATURES } from "@/lib/site-features";

/**
 * Lien vers la même page dans l'autre langue.
 *
 * Un `<a>` simple, pas un `Link` : changer de langue change de layout racine, donc recharge
 * la page de toute façon. La query string et l'ancre sont reprises au clic — c'est ce qui
 * garde l'adresse analysée — plutôt que lues au rendu, ce qui obligerait les pages
 * statiques à passer par `useSearchParams`.
 *
 * Rien n'est rendu tant que la version anglaise n'est pas lancée.
 */
export function LanguageSwitcher({ route, className }: { route: RouteId; className?: string }) {
  const { locale } = useI18n();
  if (!FEATURES.englishLaunched) return null;

  return (
    <>
      {LOCALES.filter((other) => other !== locale).map((other) => {
        const href = localizedHref(other, route);
        return (
          <a
            key={other}
            href={href}
            hrefLang={LOCALE_TAGS[other]}
            lang={LOCALE_TAGS[other]}
            className={className}
            onClick={(event) => {
              event.currentTarget.href = `${href}${window.location.search}${window.location.hash}`;
            }}
          >
            {LOCALE_NAMES[other]}
          </a>
        );
      })}
    </>
  );
}
