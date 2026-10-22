/**
 * Collèges et lycées alentour — annuaire de l'éducation et données publiées par
 * établissement (DEPP), importés par scripts/import_schools.py.
 *
 * Les types sont ceux du DTO : l'écran les reçoit tels quels (codes, nombres, texte source),
 * le texte affiché est produit côté client.
 */
export type {
  NearbySchoolDto as NearbySchool,
  NearbySchoolsDto as NearbySchools,
  SchoolExamResultDto as SchoolExamResult,
  SchoolIndicatorDto as SchoolIndicator,
  SchoolLevelDto as SchoolLevel,
  SchoolOfferCodeDto as SchoolOfferCode,
  SchoolVoieDto as SchoolVoie,
} from "@/server-shared/types/location-analysis.dto";

/** Rayons de recherche autour d'une adresse : un collège se choisit près de chez soi, un lycée recrute plus large. */
export const COLLEGE_RADIUS_M = 2_000;
export const LYCEE_RADIUS_M = 5_000;
