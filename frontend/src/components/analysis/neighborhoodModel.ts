import type { NeighborhoodAnalysisDto } from "@/types/location-analysis";

type Poi = NeighborhoodAnalysisDto["pois"][number];

/** Partagé par `NeighborhoodCard` et `PdfNeighborhood`, pour que les deux listent pareil. */
export const CATEGORY_LABELS: Record<string, string> = {
  school: "Enseignement",
  supermarket: "Supermarché",
  bakery: "Boulangerie",
  pharmacy: "Pharmacie",
  doctor: "Médecin",
  park: "Parc",
  sport: "Sport",
  restaurant: "Restaurant",
  post_office: "Poste",
  bank: "Banque",
  library: "Bibliothèque",
  hospital: "Hôpital ou clinique",
  emergency: "Urgences",
};

/**
 * Les 11 catégories de POI se lisaient en liste plate, sans hiérarchie. Elles se regroupent
 * en 4 familles, qui sont la façon dont on cherche réellement : « y a-t-il une école ? »,
 * « un médecin ? », plutôt que de parcourir onze rubriques de même niveau.
 *
 * L'ordre à l'intérieur d'une famille est celui de ce tableau, pas celui du DTO — le plus
 * structurant d'abord (l'école avant la bibliothèque, la pharmacie avant le médecin).
 */
const FAMILIES: Array<{ title: string; categories: string[] }> = [
  { title: "Enseignement", categories: ["school"] },
  { title: "Soins", categories: ["pharmacy", "doctor", "hospital", "emergency"] },
  { title: "Commerces & services", categories: ["supermarket", "bakery", "post_office", "bank"] },
  { title: "Culture & loisirs", categories: ["library", "park", "sport", "restaurant"] },
];

const DEFAULT_PER_CATEGORY_LIMIT = 3;
const PER_CATEGORY_LIMIT: Record<string, number> = {
  school: 6,
  hospital: 2,
  emergency: 1,
};

export function categoryLimit(category: string): number {
  return PER_CATEGORY_LIMIT[category] ?? DEFAULT_PER_CATEGORY_LIMIT;
}

export function groupByCategory(pois: Poi[]): Record<string, Poi[]> {
  const groups: Record<string, Poi[]> = {};
  for (const poi of pois) {
    const key = poi.category;
    if (!groups[key]) groups[key] = [];
    groups[key].push(poi);
  }
  return groups;
}

/**
 * Le nombre d'équipements de chaque famille, sommé sur ses catégories — pour « dans un
 * rayon de 500 m ». Toutes les familles sont rendues, même à zéro : « aucun » se compare
 * d'une adresse à l'autre aussi bien qu'un nombre.
 */
export function familyCounts(byCategory: Partial<Record<string, number>>): Array<{ title: string; count: number }> {
  return FAMILIES.map((family) => ({
    title: family.title,
    count: family.categories.reduce((sum, category) => sum + (byCategory[category] ?? 0), 0),
  }));
}

/** Vrai si au moins une catégorie compte plus d'équipements qu'on n'en affiche. */
export function isTruncated(groups: Record<string, Poi[]>): boolean {
  return Object.entries(groups).some(([category, pois]) => pois.length > categoryLimit(category));
}

/**
 * Les familles qui ont au moins un équipement, réduites à leurs catégories présentes.
 *
 * Une catégorie absente du tableau des familles resterait invisible : on la rattache à
 * « Autres » plutôt que de la perdre silencieusement si le back en ajoute une.
 */
export function presentFamilies(groups: Record<string, Poi[]>): Array<{ title: string; categories: string[] }> {
  const known = new Set(FAMILIES.flatMap((family) => family.categories));
  const others = Object.keys(groups).filter((category) => !known.has(category));
  const families = others.length ? [...FAMILIES, { title: "Autres", categories: others }] : FAMILIES;
  return families
    .map((family) => ({
      title: family.title,
      categories: family.categories.filter((category) => groups[category]?.length),
    }))
    .filter((family) => family.categories.length > 0);
}
