import type { NearbySchoolDto, NearbySchoolsDto, SchoolExamResultDto } from "@/types/location-analysis";
import type { SchoolPoint } from "@/components/map/Map";

/** Colonnes triables de la card ; « distance » est l'ordre par défaut. */
export type SchoolSortKey = "distance" | "reussite" | "va" | "ips" | "eleves";
export type SortDirection = "asc" | "desc";

/**
 * Sens du premier clic sur chaque colonne : le plus proche, la meilleure réussite, la plus
 * forte valeur ajoutée, l'IPS le plus élevé, les classes les moins chargées. Un second clic
 * inverse. Aucun de ces ordres n'est un classement de qualité : c'est le lecteur qui choisit
 * ce qui compte pour lui.
 */
export const DEFAULT_DIRECTION: Record<SchoolSortKey, SortDirection> = {
  distance: "asc",
  reussite: "desc",
  va: "desc",
  ips: "desc",
  eleves: "asc",
};

/**
 * L'examen qui décrit l'établissement : le brevet pour un collège ; pour un lycée, le bac
 * général et technologique s'il en a un, sinon le bac professionnel. Un lycée polyvalent
 * a les deux : le second est rendu à part (`secondaryExam`).
 */
export function primaryExam(s: NearbySchoolDto): SchoolExamResultDto | null {
  return s.level === "college" ? s.brevet : (s.bacGt ?? s.bacPro);
}

export function secondaryExam(s: NearbySchoolDto): SchoolExamResultDto | null {
  return s.level === "lycee" && s.bacGt && s.bacPro ? s.bacPro : null;
}

function sortValue(s: NearbySchoolDto, key: SchoolSortKey): number | null {
  switch (key) {
    case "distance":
      return s.distance;
    case "reussite":
      return primaryExam(s)?.tauxReussite ?? null;
    case "va":
      return primaryExam(s)?.vaReussite ?? null;
    case "ips":
      return s.ips?.valeur ?? null;
    case "eleves":
      return s.elevesParDivision?.valeur ?? null;
  }
}

/**
 * Trie sans modifier la liste reçue. Une valeur non publiée va en fin de liste dans les
 * deux sens : la mettre en tête d'un tri croissant la ferait passer pour la meilleure.
 * À égalité, la distance départage.
 */
export function sortSchools(
  list: NearbySchoolDto[],
  key: SchoolSortKey,
  direction: SortDirection,
): NearbySchoolDto[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va === null && vb === null) return a.distance - b.distance;
    if (va === null) return 1;
    if (vb === null) return -1;
    return va === vb ? a.distance - b.distance : (va - vb) * sign;
  });
}

/** Le tableau affichera-t-il au moins un « non publié » ? Mêmes colonnes que `SchoolRow`. */
export function hasNotPublished(list: NearbySchoolDto[]): boolean {
  return list.some((s) => {
    const exams = [primaryExam(s), secondaryExam(s)].filter((e): e is SchoolExamResultDto => e !== null);
    return (
      exams.length === 0 ||
      exams.some((e) => e.tauxReussite === null || e.vaReussite === null) ||
      !s.ips ||
      !s.elevesParDivision
    );
  });
}

/** Les points de la carte, dans l'ordre collèges puis lycées. */
export function schoolPoints(schools: NearbySchoolsDto): SchoolPoint[] {
  return [...schools.colleges, ...schools.lycees].map((s) => ({
    uai: s.uai,
    level: s.level,
    nom: s.nom,
    lat: s.lat,
    lon: s.lon,
    distance: s.distance,
    reussite: primaryExam(s)?.tauxReussite ?? null,
    estSecteur: s.estSecteur,
  }));
}

/** La section a-t-elle quelque chose à montrer ? */
export function hasSchools(schools: NearbySchoolsDto | null | undefined): schools is NearbySchoolsDto {
  return !!schools && schools.colleges.length + schools.lycees.length > 0;
}
