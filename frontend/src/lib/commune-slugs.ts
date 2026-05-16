/**
 * Mapping en dur slug ↔ code INSEE pour la phase 0 SEO programmatique.
 * En phase 2 (top 500 communes France), remplacer par une table Postgres
 * `commune_slug (code_commune, slug, nom_affiche, nom_parent)` générée
 * automatiquement depuis le COG (Code Officiel Géographique) INSEE.
 */

export type City = "paris" | "lyon" | "marseille";

export interface CommuneSlugEntry {
  slug: string;
  codeCommune: string; // code INSEE
  city: City;
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

export interface CityDef {
  /** Code INSEE officiel de la commune au sens administratif global. */
  codeCommune: string;
  nomAffiche: string;
  /** Adjectif au féminin pour les comparatifs (« moyenne {adjectif} »). */
  adjectif: string;
  /** Eyebrow affiché sur le hub. */
  region: string;
  /** Pattern SQL utilisé pour agréger toutes les transactions/équipements de la ville. */
  sqlPattern: string;
  /** Label affiché en source pour les données qualité de l'air. */
  airSourceLabel: string;
  /** Centroïde approximatif. */
  lat: number;
  lon: number;
  nbArrondissements: number;
}

export const CITIES: Record<City, CityDef> = {
  paris: {
    codeCommune: "75056",
    nomAffiche: "Paris",
    adjectif: "parisienne",
    region: "Île-de-France · Métropole",
    sqlPattern: "751%",
    airSourceLabel: "AirParif",
    lat: 48.8566,
    lon: 2.3522,
    nbArrondissements: 20,
  },
  lyon: {
    codeCommune: "69123",
    nomAffiche: "Lyon",
    adjectif: "lyonnaise",
    region: "Auvergne-Rhône-Alpes · Métropole",
    sqlPattern: "693%",
    airSourceLabel: "Atmo Auvergne-Rhône-Alpes",
    lat: 45.7640,
    lon: 4.8357,
    nbArrondissements: 9,
  },
  marseille: {
    codeCommune: "13055",
    nomAffiche: "Marseille",
    adjectif: "marseillaise",
    region: "Provence-Alpes-Côte d'Azur · Métropole",
    sqlPattern: "132%",
    airSourceLabel: "AtmoSud",
    lat: 43.2965,
    lon: 5.3698,
    nbArrondissements: 16,
  },
};

export const ALL_CITY_SLUGS: City[] = ["paris", "lyon", "marseille"];

/* -------------------------------------------------------------------------- */
/* PARIS                                                                       */
/* -------------------------------------------------------------------------- */

const PARIS_ARRONDISSEMENTS: CommuneSlugEntry[] = [
  {
    slug: "paris-1er", codeCommune: "75101", city: "paris",
    nomAffiche: "Paris 1er arrondissement", nomCourt: "Paris 1er",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8625, lon: 2.3364,
    voisins: ["paris-2e", "paris-4e", "paris-6e", "paris-7e", "paris-8e"],
  },
  {
    slug: "paris-2e", codeCommune: "75102", city: "paris",
    nomAffiche: "Paris 2e arrondissement", nomCourt: "Paris 2e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8682, lon: 2.3417,
    voisins: ["paris-1er", "paris-3e", "paris-9e", "paris-10e"],
  },
  {
    slug: "paris-3e", codeCommune: "75103", city: "paris",
    nomAffiche: "Paris 3e arrondissement", nomCourt: "Paris 3e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8630, lon: 2.3600,
    voisins: ["paris-2e", "paris-4e", "paris-10e", "paris-11e"],
  },
  {
    slug: "paris-4e", codeCommune: "75104", city: "paris",
    nomAffiche: "Paris 4e arrondissement", nomCourt: "Paris 4e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8546, lon: 2.3573,
    voisins: ["paris-1er", "paris-3e", "paris-11e", "paris-12e"],
  },
  {
    slug: "paris-5e", codeCommune: "75105", city: "paris",
    nomAffiche: "Paris 5e arrondissement", nomCourt: "Paris 5e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8462, lon: 2.3460,
    voisins: ["paris-4e", "paris-6e", "paris-12e", "paris-13e"],
  },
  {
    slug: "paris-6e", codeCommune: "75106", city: "paris",
    nomAffiche: "Paris 6e arrondissement", nomCourt: "Paris 6e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8496, lon: 2.3329,
    voisins: ["paris-1er", "paris-5e", "paris-7e", "paris-14e", "paris-15e"],
  },
  {
    slug: "paris-7e", codeCommune: "75107", city: "paris",
    nomAffiche: "Paris 7e arrondissement", nomCourt: "Paris 7e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8559, lon: 2.3128,
    voisins: ["paris-1er", "paris-6e", "paris-8e", "paris-15e"],
  },
  {
    slug: "paris-8e", codeCommune: "75108", city: "paris",
    nomAffiche: "Paris 8e arrondissement", nomCourt: "Paris 8e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8731, lon: 2.3146,
    voisins: ["paris-1er", "paris-2e", "paris-7e", "paris-9e", "paris-16e", "paris-17e"],
  },
  {
    slug: "paris-9e", codeCommune: "75109", city: "paris",
    nomAffiche: "Paris 9e arrondissement", nomCourt: "Paris 9e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8770, lon: 2.3375,
    voisins: ["paris-2e", "paris-8e", "paris-10e", "paris-18e"],
  },
  {
    slug: "paris-10e", codeCommune: "75110", city: "paris",
    nomAffiche: "Paris 10e arrondissement", nomCourt: "Paris 10e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8761, lon: 2.3601,
    voisins: ["paris-2e", "paris-3e", "paris-9e", "paris-11e", "paris-18e", "paris-19e"],
  },
  {
    slug: "paris-11e", codeCommune: "75111", city: "paris",
    nomAffiche: "Paris 11e arrondissement", nomCourt: "Paris 11e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8594, lon: 2.3795,
    voisins: ["paris-3e", "paris-4e", "paris-10e", "paris-12e", "paris-19e", "paris-20e"],
  },
  {
    slug: "paris-12e", codeCommune: "75112", city: "paris",
    nomAffiche: "Paris 12e arrondissement", nomCourt: "Paris 12e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8407, lon: 2.3877,
    voisins: ["paris-4e", "paris-5e", "paris-11e", "paris-13e", "paris-20e"],
  },
  {
    slug: "paris-13e", codeCommune: "75113", city: "paris",
    nomAffiche: "Paris 13e arrondissement", nomCourt: "Paris 13e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8284, lon: 2.3625,
    voisins: ["paris-5e", "paris-12e", "paris-14e"],
  },
  {
    slug: "paris-14e", codeCommune: "75114", city: "paris",
    nomAffiche: "Paris 14e arrondissement", nomCourt: "Paris 14e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8294, lon: 2.3267,
    voisins: ["paris-6e", "paris-13e", "paris-15e"],
  },
  {
    slug: "paris-15e", codeCommune: "75115", city: "paris",
    nomAffiche: "Paris 15e arrondissement", nomCourt: "Paris 15e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8417, lon: 2.2989,
    voisins: ["paris-6e", "paris-7e", "paris-14e", "paris-16e"],
  },
  {
    slug: "paris-16e", codeCommune: "75116", city: "paris",
    nomAffiche: "Paris 16e arrondissement", nomCourt: "Paris 16e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8602, lon: 2.2614,
    voisins: ["paris-7e", "paris-8e", "paris-15e", "paris-17e"],
  },
  {
    slug: "paris-17e", codeCommune: "75117", city: "paris",
    nomAffiche: "Paris 17e arrondissement", nomCourt: "Paris 17e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8848, lon: 2.3072,
    voisins: ["paris-8e", "paris-9e", "paris-16e", "paris-18e"],
  },
  {
    slug: "paris-18e", codeCommune: "75118", city: "paris",
    nomAffiche: "Paris 18e arrondissement", nomCourt: "Paris 18e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8924, lon: 2.3444,
    voisins: ["paris-9e", "paris-10e", "paris-17e", "paris-19e"],
  },
  {
    slug: "paris-19e", codeCommune: "75119", city: "paris",
    nomAffiche: "Paris 19e arrondissement", nomCourt: "Paris 19e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8881, lon: 2.3829,
    voisins: ["paris-10e", "paris-11e", "paris-18e", "paris-20e"],
  },
  {
    slug: "paris-20e", codeCommune: "75120", city: "paris",
    nomAffiche: "Paris 20e arrondissement", nomCourt: "Paris 20e",
    parentSlug: "paris", parentNom: "Paris",
    lat: 48.8634, lon: 2.4078,
    voisins: ["paris-11e", "paris-12e", "paris-19e"],
  },
];

const PARIS_HUB: CommuneSlugEntry = {
  slug: "paris", codeCommune: "75056", city: "paris",
  nomAffiche: "Paris", nomCourt: "Paris",
  parentSlug: null, parentNom: null,
  lat: CITIES.paris.lat, lon: CITIES.paris.lon,
  voisins: [],
};

/* -------------------------------------------------------------------------- */
/* LYON                                                                        */
/* -------------------------------------------------------------------------- */

const LYON_ARRONDISSEMENTS: CommuneSlugEntry[] = [
  {
    slug: "lyon-1er", codeCommune: "69381", city: "lyon",
    nomAffiche: "Lyon 1er arrondissement", nomCourt: "Lyon 1er",
    parentSlug: "lyon", parentNom: "Lyon",
    lat: 45.7711, lon: 4.8265,
    voisins: ["lyon-2e", "lyon-4e", "lyon-6e", "lyon-9e"],
  },
  {
    slug: "lyon-2e", codeCommune: "69382", city: "lyon",
    nomAffiche: "Lyon 2e arrondissement", nomCourt: "Lyon 2e",
    parentSlug: "lyon", parentNom: "Lyon",
    lat: 45.7515, lon: 4.8307,
    voisins: ["lyon-1er", "lyon-5e", "lyon-7e"],
  },
  {
    slug: "lyon-3e", codeCommune: "69383", city: "lyon",
    nomAffiche: "Lyon 3e arrondissement", nomCourt: "Lyon 3e",
    parentSlug: "lyon", parentNom: "Lyon",
    lat: 45.7506, lon: 4.8517,
    voisins: ["lyon-6e", "lyon-7e", "lyon-8e"],
  },
  {
    slug: "lyon-4e", codeCommune: "69384", city: "lyon",
    nomAffiche: "Lyon 4e arrondissement", nomCourt: "Lyon 4e",
    parentSlug: "lyon", parentNom: "Lyon",
    lat: 45.7790, lon: 4.8255,
    voisins: ["lyon-1er", "lyon-9e"],
  },
  {
    slug: "lyon-5e", codeCommune: "69385", city: "lyon",
    nomAffiche: "Lyon 5e arrondissement", nomCourt: "Lyon 5e",
    parentSlug: "lyon", parentNom: "Lyon",
    lat: 45.7570, lon: 4.8067,
    voisins: ["lyon-2e", "lyon-9e"],
  },
  {
    slug: "lyon-6e", codeCommune: "69386", city: "lyon",
    nomAffiche: "Lyon 6e arrondissement", nomCourt: "Lyon 6e",
    parentSlug: "lyon", parentNom: "Lyon",
    lat: 45.7720, lon: 4.8500,
    voisins: ["lyon-1er", "lyon-3e"],
  },
  {
    slug: "lyon-7e", codeCommune: "69387", city: "lyon",
    nomAffiche: "Lyon 7e arrondissement", nomCourt: "Lyon 7e",
    parentSlug: "lyon", parentNom: "Lyon",
    lat: 45.7372, lon: 4.8410,
    voisins: ["lyon-2e", "lyon-3e", "lyon-8e"],
  },
  {
    slug: "lyon-8e", codeCommune: "69388", city: "lyon",
    nomAffiche: "Lyon 8e arrondissement", nomCourt: "Lyon 8e",
    parentSlug: "lyon", parentNom: "Lyon",
    lat: 45.7370, lon: 4.8717,
    voisins: ["lyon-3e", "lyon-7e"],
  },
  {
    slug: "lyon-9e", codeCommune: "69389", city: "lyon",
    nomAffiche: "Lyon 9e arrondissement", nomCourt: "Lyon 9e",
    parentSlug: "lyon", parentNom: "Lyon",
    lat: 45.7768, lon: 4.8060,
    voisins: ["lyon-1er", "lyon-4e", "lyon-5e"],
  },
];

const LYON_HUB: CommuneSlugEntry = {
  slug: "lyon", codeCommune: "69123", city: "lyon",
  nomAffiche: "Lyon", nomCourt: "Lyon",
  parentSlug: null, parentNom: null,
  lat: CITIES.lyon.lat, lon: CITIES.lyon.lon,
  voisins: [],
};

/* -------------------------------------------------------------------------- */
/* MARSEILLE                                                                   */
/* -------------------------------------------------------------------------- */

const MARSEILLE_ARRONDISSEMENTS: CommuneSlugEntry[] = [
  {
    slug: "marseille-1er", codeCommune: "13201", city: "marseille",
    nomAffiche: "Marseille 1er arrondissement", nomCourt: "Marseille 1er",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.2999, lon: 5.3815,
    voisins: ["marseille-2e", "marseille-5e", "marseille-6e"],
  },
  {
    slug: "marseille-2e", codeCommune: "13202", city: "marseille",
    nomAffiche: "Marseille 2e arrondissement", nomCourt: "Marseille 2e",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.3047, lon: 5.3633,
    voisins: ["marseille-1er", "marseille-3e", "marseille-7e"],
  },
  {
    slug: "marseille-3e", codeCommune: "13203", city: "marseille",
    nomAffiche: "Marseille 3e arrondissement", nomCourt: "Marseille 3e",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.3175, lon: 5.3825,
    voisins: ["marseille-2e", "marseille-4e", "marseille-14e", "marseille-15e"],
  },
  {
    slug: "marseille-4e", codeCommune: "13204", city: "marseille",
    nomAffiche: "Marseille 4e arrondissement", nomCourt: "Marseille 4e",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.3055, lon: 5.4034,
    voisins: ["marseille-3e", "marseille-5e", "marseille-12e"],
  },
  {
    slug: "marseille-5e", codeCommune: "13205", city: "marseille",
    nomAffiche: "Marseille 5e arrondissement", nomCourt: "Marseille 5e",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.2870, lon: 5.3970,
    voisins: ["marseille-1er", "marseille-4e", "marseille-6e", "marseille-10e"],
  },
  {
    slug: "marseille-6e", codeCommune: "13206", city: "marseille",
    nomAffiche: "Marseille 6e arrondissement", nomCourt: "Marseille 6e",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.2880, lon: 5.3850,
    voisins: ["marseille-1er", "marseille-5e", "marseille-7e", "marseille-8e"],
  },
  {
    slug: "marseille-7e", codeCommune: "13207", city: "marseille",
    nomAffiche: "Marseille 7e arrondissement", nomCourt: "Marseille 7e",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.2802, lon: 5.3500,
    voisins: ["marseille-2e", "marseille-6e", "marseille-8e"],
  },
  {
    slug: "marseille-8e", codeCommune: "13208", city: "marseille",
    nomAffiche: "Marseille 8e arrondissement", nomCourt: "Marseille 8e",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.2570, lon: 5.3800,
    voisins: ["marseille-6e", "marseille-7e", "marseille-9e"],
  },
  {
    slug: "marseille-9e", codeCommune: "13209", city: "marseille",
    nomAffiche: "Marseille 9e arrondissement", nomCourt: "Marseille 9e",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.2497, lon: 5.4170,
    voisins: ["marseille-8e", "marseille-10e"],
  },
  {
    slug: "marseille-10e", codeCommune: "13210", city: "marseille",
    nomAffiche: "Marseille 10e arrondissement", nomCourt: "Marseille 10e",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.2807, lon: 5.4283,
    voisins: ["marseille-5e", "marseille-9e", "marseille-11e"],
  },
  {
    slug: "marseille-11e", codeCommune: "13211", city: "marseille",
    nomAffiche: "Marseille 11e arrondissement", nomCourt: "Marseille 11e",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.2778, lon: 5.4807,
    voisins: ["marseille-10e", "marseille-12e"],
  },
  {
    slug: "marseille-12e", codeCommune: "13212", city: "marseille",
    nomAffiche: "Marseille 12e arrondissement", nomCourt: "Marseille 12e",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.3083, lon: 5.4350,
    voisins: ["marseille-4e", "marseille-11e", "marseille-13e"],
  },
  {
    slug: "marseille-13e", codeCommune: "13213", city: "marseille",
    nomAffiche: "Marseille 13e arrondissement", nomCourt: "Marseille 13e",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.3380, lon: 5.4290,
    voisins: ["marseille-12e", "marseille-14e"],
  },
  {
    slug: "marseille-14e", codeCommune: "13214", city: "marseille",
    nomAffiche: "Marseille 14e arrondissement", nomCourt: "Marseille 14e",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.3320, lon: 5.3920,
    voisins: ["marseille-3e", "marseille-13e", "marseille-15e"],
  },
  {
    slug: "marseille-15e", codeCommune: "13215", city: "marseille",
    nomAffiche: "Marseille 15e arrondissement", nomCourt: "Marseille 15e",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.3530, lon: 5.3680,
    voisins: ["marseille-3e", "marseille-14e", "marseille-16e"],
  },
  {
    slug: "marseille-16e", codeCommune: "13216", city: "marseille",
    nomAffiche: "Marseille 16e arrondissement", nomCourt: "Marseille 16e",
    parentSlug: "marseille", parentNom: "Marseille",
    lat: 43.3735, lon: 5.3300,
    voisins: ["marseille-15e"],
  },
];

const MARSEILLE_HUB: CommuneSlugEntry = {
  slug: "marseille", codeCommune: "13055", city: "marseille",
  nomAffiche: "Marseille", nomCourt: "Marseille",
  parentSlug: null, parentNom: null,
  lat: CITIES.marseille.lat, lon: CITIES.marseille.lon,
  voisins: [],
};

/* -------------------------------------------------------------------------- */
/* Exports                                                                     */
/* -------------------------------------------------------------------------- */

export const ALL_COMMUNE_SLUGS: CommuneSlugEntry[] = [
  PARIS_HUB,
  ...PARIS_ARRONDISSEMENTS,
  LYON_HUB,
  ...LYON_ARRONDISSEMENTS,
  MARSEILLE_HUB,
  ...MARSEILLE_ARRONDISSEMENTS,
];

const BY_SLUG = new Map(ALL_COMMUNE_SLUGS.map((c) => [c.slug, c]));
const BY_CODE_INSEE = new Map(ALL_COMMUNE_SLUGS.map((c) => [c.codeCommune, c]));

const ARRONDISSEMENTS_BY_CITY: Record<City, CommuneSlugEntry[]> = {
  paris: PARIS_ARRONDISSEMENTS,
  lyon: LYON_ARRONDISSEMENTS,
  marseille: MARSEILLE_ARRONDISSEMENTS,
};

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

export function getArrondissementsByCity(city: City): CommuneSlugEntry[] {
  return ARRONDISSEMENTS_BY_CITY[city];
}

/**
 * Vrai si le slug correspond au hub d'une ville (paris, lyon, marseille),
 * c.-à-d. à une page de listing servie par /commune/{ville}/page.tsx
 * et non par la route dynamique /commune/[slug].
 */
export function isCityHubSlug(slug: string): boolean {
  return (ALL_CITY_SLUGS as string[]).includes(slug);
}

/**
 * Récupère la City correspondant à un code INSEE de commune ou d'arrondissement.
 * Renvoie null si le code n'appartient à aucune des villes couvertes.
 */
export function getCityForCodeInsee(codeInsee: string): City | null {
  const entry = BY_CODE_INSEE.get(codeInsee);
  return entry ? entry.city : null;
}
