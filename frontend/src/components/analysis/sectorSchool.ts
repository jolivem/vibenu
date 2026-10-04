import type { SchoolSectorDto } from "@/types/location-analysis";

export type SectorSchool = Pick<SchoolSectorDto, "niveau" | "nomEtablissement">;

/**
 * Mots qui ne distinguent pas un établissement d'un autre : on les écarte avant de
 * comparer. « MADAME DE STAEL » (carte scolaire) et « Collège de Stael » (OSM/BPE) se
 * réduisent alors tous deux à « stael ».
 */
const SCHOOL_NAME_STOPWORDS = new Set([
  "ecole", "college", "lycee", "public", "publique", "prive", "privee",
  "general", "generale", "technologique", "polyvalent", "polyvalente",
  "madame", "monsieur", "saint", "sainte",
]);

function normalizeSchoolName(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function schoolNameTokens(name: string): string[] {
  return normalizeSchoolName(name)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !SCHOOL_NAME_STOPWORDS.has(t));
}

/**
 * Un POI est l'établissement de secteur s'il est du même niveau et porte tous les mots
 * distinctifs du nom de la carte scolaire.
 *
 * Le niveau d'abord : dans le 15e, « Collège Buffon » et « Lycée Buffon » partagent le
 * même nom et presque la même adresse. Tous les mots ensuite, et non un seul : un
 * secteur « Jean Moulin » ne doit pas épingler un « Collège Jean Zay ».
 */
export function isSectorSchool(poiName: string, sector: SectorSchool): boolean {
  if (!new RegExp(`\\b${sector.niveau}\\b`).test(normalizeSchoolName(poiName))) return false;
  const wanted = schoolNameTokens(sector.nomEtablissement);
  if (wanted.length === 0) return false;
  const have = new Set(schoolNameTokens(poiName));
  return wanted.every((t) => have.has(t));
}

/**
 * Les écoles à afficher : les `limit` plus proches, plus l'établissement de secteur s'il
 * figure plus loin dans la liste. Ajouté en fin : il est plus loin que les autres, l'ordre
 * des distances reste croissant.
 *
 * Partagé par la card Voisinage et le PDF, pour que les deux montrent la même liste.
 */
export function withSectorSchool<T extends { name: string }>(
  schools: T[],
  limit: number,
  sector: SectorSchool | null | undefined,
): { shown: T[]; sectorPoi: T | null } {
  const shown = schools.slice(0, limit);
  const sectorPoi = sector ? schools.find((poi) => isSectorSchool(poi.name, sector)) ?? null : null;
  if (sectorPoi && !shown.includes(sectorPoi)) shown.push(sectorPoi);
  return { shown, sectorPoi };
}
