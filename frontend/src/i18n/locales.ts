/**
 * Les langues du site et leurs routes.
 *
 * Le français est la langue d'origine : ses URL n'ont pas de préfixe et ne doivent jamais
 * changer (liens d'analyse déjà partagés, pages commune référencées). Les autres langues
 * vivent sous leur préfixe (`/en/…`).
 *
 * Les pages `/commune/*` n'existent qu'en français : elles ne passent pas par
 * `localizedHref` et gardent leurs liens en dur.
 */
export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export function isLocale(value: string | null | undefined): value is Locale {
  return (LOCALES as readonly string[]).includes(value ?? "");
}

/** Balise BCP 47 passée à `Intl` et aux attributs `lang` / `hreflang`. */
export const LOCALE_TAGS: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-GB",
};

/** Nom de chaque langue, écrit dans cette langue : c'est ce qu'affiche le sélecteur. */
export const LOCALE_NAMES: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};

/** Valeur de `og:locale`. */
export const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
  fr: "fr_FR",
  en: "en_GB",
};

/** Les pages traduites. Ajouter une route ne compile pas tant que chaque langue n'a pas son chemin. */
export const ROUTES = {
  home: { fr: "/", en: "/en" },
  about: { fr: "/a-propos", en: "/en/about" },
  analyze: { fr: "/analyze", en: "/en/analyze" },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteId = keyof typeof ROUTES;

/**
 * Chemin d'une page traduite dans une langue, avec sa query string et son ancre éventuelles.
 * `query` est déjà encodée (`URLSearchParams.toString()`), `hash` s'écrit sans le `#`.
 */
export function localizedHref(
  locale: Locale,
  route: RouteId,
  options: { query?: string; hash?: string } = {},
): string {
  const { query, hash } = options;
  return `${ROUTES[route][locale]}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

/**
 * Balises `hreflang` d'une page traduite : une entrée par langue, plus `x-default` sur le
 * français, langue d'origine du site. À ne poser que sur les pages indexables.
 */
export function languageAlternates(route: RouteId): Record<string, string> {
  return {
    ...Object.fromEntries(LOCALES.map((locale) => [LOCALE_TAGS[locale], ROUTES[route][locale]])),
    "x-default": ROUTES[route][DEFAULT_LOCALE],
  };
}
