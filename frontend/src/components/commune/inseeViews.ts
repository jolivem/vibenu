/**
 * Les vues INSEE logement / emploi / ménages d'un arrondissement.
 *
 * Extraites du composant parce que trois consommateurs en dépendent désormais — les deux
 * cards et le garde qui décide de les monter. L'arrondissement occupe l'échelle `commune`,
 * comme en mode commune de l'analyse, et n'est comparé qu'à la France.
 */

import type {
  EmploymentStats,
  HouseholdsStats,
  HousingStats,
} from "@/server-modules/demographics/domain/insee-profile.types";
import type { CommuneStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import { viewForMode, type InseeView } from "@/components/analysis/inseeChart";
import { population } from "@/i18n/messages/fr/analysis/population";
import { FEATURES } from "@/lib/site-features";

export interface CommuneInseeViews {
  employment: InseeView<EmploymentStats> | null;
  households: InseeView<HouseholdsStats> | null;
  housing: InseeView<HousingStats> | null;
}

/**
 * Les messages de l'analyse sans les notes de méthode des graphes : sur les 45 pages, elles
 * étaient le même texte recopié, et elles vivent désormais sur `/commune/methode`. Une note
 * vide n'est pas rendue (`{note && …}`).
 */
const m: typeof population = {
  ...population,
  employment: { ...population.employment, cspNote: "" },
  housing: { ...population.housing, dwellingNote: "", epochNote: "" },
};

export function communeInseeViews(stats: CommuneStats, nomCourt: string): CommuneInseeViews {
  const scale = { nomCommune: nomCourt, communeIrisCount: 1 };
  return {
    employment: FEATURES.showEmployment ? viewForMode(stats.employment, "commune", scale, m) : null,
    households: FEATURES.showHouseholds ? viewForMode(stats.households, "commune", scale, m) : null,
    housing: FEATURES.showHousing ? viewForMode(stats.housing, "commune", scale, m) : null,
  };
}
