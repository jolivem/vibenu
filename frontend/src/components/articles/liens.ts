import { getCommuneByCodeInsee } from "@/lib/commune-slugs";
import { FEATURES } from "@/lib/site-features";

/**
 * Le lien d'un article vers une commune : sa page `/commune/*` si elle existe, rien sinon.
 *
 * `/analyze` n'est pas une cible : elle est fermée aux robots et demande des coordonnées.
 * Quand le répertoire des communes (plan des 2 200 pages) existera, c'est ici qu'il
 * s'ajoutera, et tous les articles gagneront leurs liens d'un coup.
 */
export function communeHref(codeInsee: string): string | undefined {
  if (!FEATURES.hasSEOPages) return undefined;
  const entry = getCommuneByCodeInsee(codeInsee);
  return entry ? `/commune/${entry.slug}` : undefined;
}
