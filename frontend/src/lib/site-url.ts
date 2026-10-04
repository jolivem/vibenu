/**
 * URL publique du site, sans barre finale. Lue côté serveur ; les pages statiques la
 * figent au build (build-arg `SITE_URL` du Dockerfile).
 */
export const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

/** URL absolue d'un chemin du site ; la racine rend `SITE_URL` nu, sans barre finale. */
export function absoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}
