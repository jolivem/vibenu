import { FEATURES } from "@/lib/site-features";
import { getCommuneByCodeInsee, isCityHubSlug, type CommuneSlugEntry } from "@/lib/commune-slugs";

/**
 * L'aiguillage entre les deux expériences « commune » — l'analyse en mode commune
 * (`/analyze?type=municipality`) et les pages commune SEO (`/commune/*`). Cf. CLAUDE.md,
 * « Mode commune vs pages commune SEO ».
 *
 * Règle : une ville entière (Paris, Lyon, Marseille) ouvre son hub SEO, tout le reste —
 * arrondissements compris — ouvre l'analyse. L'analyse traite bien un arrondissement,
 * mais pas une ville entière : la BPE et l'INSEE ne connaissent que les arrondissements,
 * et elle affichait un prix nul et les chiffres de l'arrondissement du centroïde sous le
 * nom de la ville.
 *
 * Tout passe par `FEATURES.hasSEOPages` : sans pages SEO (variante PRO), aucune entrée
 * n'est renvoyée, et la recherche ne mène plus à une 404.
 */

function seoEntry(citycode: string | null | undefined): CommuneSlugEntry | undefined {
  if (!FEATURES.hasSEOPages || !citycode) return undefined;
  return getCommuneByCodeInsee(citycode);
}

/** Le hub SEO d'une ville entière (`/commune/paris`), ou `undefined`. */
export function seoHubForCitycode(citycode: string | null | undefined): CommuneSlugEntry | undefined {
  const entry = seoEntry(citycode);
  return entry && isCityHubSlug(entry.slug) ? entry : undefined;
}

/** La page SEO d'un arrondissement (`/commune/paris-15e`), ou `undefined`. */
export function seoPageForCitycode(citycode: string | null | undefined): CommuneSlugEntry | undefined {
  const entry = seoEntry(citycode);
  return entry && !isCityHubSlug(entry.slug) ? entry : undefined;
}

/**
 * Code postal d'un arrondissement déduit de son code INSEE : département, « 0 », puis le
 * numéro de l'arrondissement sur deux chiffres — 75115 → 75015, 13201 → 13001,
 * 69381 → 69001. Le numéro occupe les deux derniers chiffres à Paris et Marseille (751xx,
 * 132xx), mais le seul dernier à Lyon (6938x) : garder deux chiffres partout donnait 69081.
 * Ne vaut que pour les arrondissements.
 */
function arrondissementPostcode(entry: CommuneSlugEntry): string {
  const code = entry.codeCommune;
  const number = entry.city === "lyon" ? code.slice(4) : code.slice(3);
  return `${code.slice(0, 2)}0${number.padStart(2, "0")}`;
}

/**
 * L'URL de l'analyse en mode commune d'un arrondissement, telle que la recherche la
 * construirait — pour que la page SEO renvoie vers l'analyse détaillée.
 */
export function analyzeUrlForCommune(entry: CommuneSlugEntry): string {
  const params = new URLSearchParams({
    lat: String(entry.lat),
    lon: String(entry.lon),
    label: entry.nomAffiche,
    city: entry.parentNom ?? entry.nomCourt,
    postcode: arrondissementPostcode(entry),
    type: "municipality",
    citycode: entry.codeCommune,
  });
  return `/analyze?${params.toString()}`;
}
