/**
 * Mapping en dur slug ↔ code INSEE pour la phase 0 SEO programmatique.
 * En phase 2 (top 500 communes France), remplacer par une table Postgres
 * `commune_slug (code_commune, slug, nom_affiche, nom_parent)` générée
 * automatiquement depuis le COG (Code Officiel Géographique) INSEE.
 */

export interface CommuneSlugEntry {
  slug: string;
  codeCommune: string; // code INSEE
  nomAffiche: string;
  nomCourt: string;
  parentSlug: string | null; // pour breadcrumb
  parentNom: string | null;
  /** centroïde indicatif (lat, lon) pour JSON-LD Place */
  lat: number;
  lon: number;
  /** Slugs des arrondissements limitrophes (maillage interne) */
  voisins: string[];
}

const PARIS_LAT = 48.8566;
const PARIS_LON = 2.3522;

/**
 * Les 20 arrondissements parisiens.
 * Codes INSEE 75101..75120 (Paris est éclatée en arrondissements dans le COG).
 * Centroïdes approximatifs (suffisants pour JSON-LD).
 * Table de voisinage construite à partir des arrondissements limitrophes réels.
 */
const PARIS_ARRONDISSEMENTS: CommuneSlugEntry[] = [
  {
    slug: "paris-1er", codeCommune: "75101",
    nomAffiche: "Paris 1er arrondissement", nomCourt: "Paris 1er",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8625, lon: 2.3364,
    voisins: ["paris-2e", "paris-4e", "paris-6e", "paris-7e", "paris-8e"],
  },
  {
    slug: "paris-2e", codeCommune: "75102",
    nomAffiche: "Paris 2e arrondissement", nomCourt: "Paris 2e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8682, lon: 2.3417,
    voisins: ["paris-1er", "paris-3e", "paris-9e", "paris-10e"],
  },
  {
    slug: "paris-3e", codeCommune: "75103",
    nomAffiche: "Paris 3e arrondissement", nomCourt: "Paris 3e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8630, lon: 2.3600,
    voisins: ["paris-2e", "paris-4e", "paris-10e", "paris-11e"],
  },
  {
    slug: "paris-4e", codeCommune: "75104",
    nomAffiche: "Paris 4e arrondissement", nomCourt: "Paris 4e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8546, lon: 2.3573,
    voisins: ["paris-1er", "paris-3e", "paris-11e", "paris-12e"],
  },
  {
    slug: "paris-5e", codeCommune: "75105",
    nomAffiche: "Paris 5e arrondissement", nomCourt: "Paris 5e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8462, lon: 2.3460,
    voisins: ["paris-4e", "paris-6e", "paris-12e", "paris-13e"],
  },
  {
    slug: "paris-6e", codeCommune: "75106",
    nomAffiche: "Paris 6e arrondissement", nomCourt: "Paris 6e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8496, lon: 2.3329,
    voisins: ["paris-1er", "paris-5e", "paris-7e", "paris-14e", "paris-15e"],
  },
  {
    slug: "paris-7e", codeCommune: "75107",
    nomAffiche: "Paris 7e arrondissement", nomCourt: "Paris 7e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8559, lon: 2.3128,
    voisins: ["paris-1er", "paris-6e", "paris-8e", "paris-15e"],
  },
  {
    slug: "paris-8e", codeCommune: "75108",
    nomAffiche: "Paris 8e arrondissement", nomCourt: "Paris 8e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8731, lon: 2.3146,
    voisins: ["paris-1er", "paris-2e", "paris-7e", "paris-9e", "paris-16e", "paris-17e"],
  },
  {
    slug: "paris-9e", codeCommune: "75109",
    nomAffiche: "Paris 9e arrondissement", nomCourt: "Paris 9e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8770, lon: 2.3375,
    voisins: ["paris-2e", "paris-8e", "paris-10e", "paris-18e"],
  },
  {
    slug: "paris-10e", codeCommune: "75110",
    nomAffiche: "Paris 10e arrondissement", nomCourt: "Paris 10e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8761, lon: 2.3601,
    voisins: ["paris-2e", "paris-3e", "paris-9e", "paris-11e", "paris-18e", "paris-19e"],
  },
  {
    slug: "paris-11e", codeCommune: "75111",
    nomAffiche: "Paris 11e arrondissement", nomCourt: "Paris 11e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8594, lon: 2.3795,
    voisins: ["paris-3e", "paris-4e", "paris-10e", "paris-12e", "paris-19e", "paris-20e"],
  },
  {
    slug: "paris-12e", codeCommune: "75112",
    nomAffiche: "Paris 12e arrondissement", nomCourt: "Paris 12e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8407, lon: 2.3877,
    voisins: ["paris-4e", "paris-5e", "paris-11e", "paris-13e", "paris-20e"],
  },
  {
    slug: "paris-13e", codeCommune: "75113",
    nomAffiche: "Paris 13e arrondissement", nomCourt: "Paris 13e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8284, lon: 2.3625,
    voisins: ["paris-5e", "paris-12e", "paris-14e"],
  },
  {
    slug: "paris-14e", codeCommune: "75114",
    nomAffiche: "Paris 14e arrondissement", nomCourt: "Paris 14e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8294, lon: 2.3267,
    voisins: ["paris-6e", "paris-13e", "paris-15e"],
  },
  {
    slug: "paris-15e", codeCommune: "75115",
    nomAffiche: "Paris 15e arrondissement", nomCourt: "Paris 15e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8417, lon: 2.2989,
    voisins: ["paris-6e", "paris-7e", "paris-14e", "paris-16e"],
  },
  {
    slug: "paris-16e", codeCommune: "75116",
    nomAffiche: "Paris 16e arrondissement", nomCourt: "Paris 16e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8602, lon: 2.2614,
    voisins: ["paris-7e", "paris-8e", "paris-15e", "paris-17e"],
  },
  {
    slug: "paris-17e", codeCommune: "75117",
    nomAffiche: "Paris 17e arrondissement", nomCourt: "Paris 17e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8848, lon: 2.3072,
    voisins: ["paris-8e", "paris-9e", "paris-16e", "paris-18e"],
  },
  {
    slug: "paris-18e", codeCommune: "75118",
    nomAffiche: "Paris 18e arrondissement", nomCourt: "Paris 18e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8924, lon: 2.3444,
    voisins: ["paris-9e", "paris-10e", "paris-17e", "paris-19e"],
  },
  {
    slug: "paris-19e", codeCommune: "75119",
    nomAffiche: "Paris 19e arrondissement", nomCourt: "Paris 19e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8881, lon: 2.3829,
    voisins: ["paris-10e", "paris-11e", "paris-18e", "paris-20e"],
  },
  {
    slug: "paris-20e", codeCommune: "75120",
    nomAffiche: "Paris 20e arrondissement", nomCourt: "Paris 20e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8634, lon: 2.4078,
    voisins: ["paris-11e", "paris-12e", "paris-19e"],
  },
];

/**
 * Page hub Paris (l'ensemble des 20 arrondissements).
 * Le code commune virtuel pour le total est obtenu via `code_commune LIKE '751%'`.
 */
const PARIS_HUB: CommuneSlugEntry = {
  slug: "paris",
  codeCommune: "75056", // code INSEE officiel "Paris" (commune au sens administratif)
  nomAffiche: "Paris",
  nomCourt: "Paris",
  parentSlug: null,
  parentNom: null,
  lat: PARIS_LAT,
  lon: PARIS_LON,
  voisins: [],
};

export const ALL_COMMUNE_SLUGS: CommuneSlugEntry[] = [PARIS_HUB, ...PARIS_ARRONDISSEMENTS];

const BY_SLUG = new Map(ALL_COMMUNE_SLUGS.map((c) => [c.slug, c]));
const BY_CODE_INSEE = new Map(ALL_COMMUNE_SLUGS.map((c) => [c.codeCommune, c]));

export function getCommuneBySlug(slug: string): CommuneSlugEntry | undefined {
  return BY_SLUG.get(slug);
}

/**
 * Lookup commune entry par code INSEE.
 * Renvoie undefined si aucune page SEO n'existe pour ce code (à compléter en phase 2).
 */
export function getCommuneByCodeInsee(codeInsee: string): CommuneSlugEntry | undefined {
  return BY_CODE_INSEE.get(codeInsee);
}

export function getParisArrondissements(): CommuneSlugEntry[] {
  return PARIS_ARRONDISSEMENTS;
}

/**
 * Filtre SQL pour récupérer toutes les transactions/équipements Paris global.
 * Utilisé pour le benchmark sur les pages d'arrondissement.
 */
export const PARIS_GLOBAL_SQL_PATTERN = "751%";

export function isParisGlobalSlug(slug: string): boolean {
  return slug === "paris";
}
