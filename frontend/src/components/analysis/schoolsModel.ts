import type { NearbySchoolDto, NearbySchoolsDto, SchoolExamResultDto } from "@/types/location-analysis";
import type { SchoolPoint } from "@/components/map/Map";

/**
 * Colonnes triables de la card. Ordre par défaut : `distance` autour d'une adresse, `nom` en
 * mode commune, où la distance au centre ne dit rien d'un logement.
 */
export type SchoolSortKey = "nom" | "distance" | "reussite" | "va" | "ips" | "eleves";
export type SortDirection = "asc" | "desc";

/**
 * Sens du premier clic sur chaque colonne : le plus proche, la meilleure réussite, la plus
 * forte valeur ajoutée, l'IPS le plus élevé, les classes les moins chargées. Un second clic
 * inverse. Aucun de ces ordres n'est un classement de qualité : c'est le lecteur qui choisit
 * ce qui compte pour lui.
 */
export const DEFAULT_DIRECTION: Record<SchoolSortKey, SortDirection> = {
  nom: "asc",
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

function sortValue(s: NearbySchoolDto, key: Exclude<SchoolSortKey, "nom">): number | null {
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
  if (key === "nom") {
    // Ceux de la commune d'abord, ceux d'à côté (ajoutés faute de mieux) après ; chaque groupe
    // par nom, dans le sens demandé. Trier ceux d'à côté par distance rendait le clic sans effet
    // quand la commune n'en compte qu'un ou aucun.
    return [...list].sort((a, b) => {
      if (a.horsCommune !== b.horsCommune) return a.horsCommune ? 1 : -1;
      return a.nom.localeCompare(b.nom, "fr") * sign;
    });
  }
  return [...list].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va === null && vb === null) return a.distance - b.distance;
    if (va === null) return 1;
    if (vb === null) return -1;
    return va === vb ? a.distance - b.distance : (va - vb) * sign;
  });
}

/**
 * Le tri par nom change-t-il quelque chose ? Les deux groupes (commune, hors commune) restent
 * séparés : il faut au moins deux établissements dans l'un d'eux.
 */
export function canSortByName(list: NearbySchoolDto[]): boolean {
  const inside = list.filter((s) => !s.horsCommune).length;
  return inside > 1 || list.length - inside > 1;
}

/** Établissements montrés en mode « L'essentiel ». */
export const ESSENTIAL_SCHOOLS = 3;

/**
 * Le collège de secteur d'abord — le seul qui concerne vraiment l'adresse —, puis les plus
 * proches (par nom en mode commune, où la distance au centre ne dit rien d'un logement).
 */
export function essentialSchools(list: NearbySchoolDto[], isCommune: boolean): NearbySchoolDto[] {
  const sector = list.filter((s) => s.estSecteur);
  const others = sortSchools(
    list.filter((s) => !s.estSecteur),
    isCommune ? "nom" : "distance",
    "asc",
  ).slice(0, ESSENTIAL_SCHOOLS);
  return [...sector, ...others];
}

/** Moyennes du département communes à toute la liste, par colonne ; `null` si elles varient. */
export interface CommonDepartmentRefs {
  reussite: number | null;
  ips: number | null;
  eleves: number | null;
}

/**
 * Sur téléphone, une moyenne du département identique sur chaque ligne n'est dite qu'une
 * fois, au-dessus de la liste. Elle varie pour les lycées, comparés aux lycées du même type
 * (général et technologique, ou professionnel) : elle reste alors sous chaque valeur.
 */
export function commonDepartmentRefs(list: NearbySchoolDto[]): CommonDepartmentRefs {
  const single = (values: Array<number | null | undefined>) => {
    const set = new Set(values.filter((v): v is number => v != null));
    return set.size === 1 ? [...set][0] : null;
  };
  return {
    reussite: single(
      list.flatMap((s) =>
        [primaryExam(s), secondaryExam(s)].map((e) => (e?.tauxReussite != null ? e.tauxReussiteDepartement : null)),
      ),
    ),
    ips: single(list.map((s) => s.ips?.departement)),
    eleves: single(list.map((s) => s.elevesParDivision?.departement)),
  };
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
