/**
 * Les vues INSEE emploi / ménages d'un arrondissement.
 *
 * Extraites du composant parce que trois consommateurs en dépendent désormais — les deux
 * cards et le garde qui décide de les monter. L'arrondissement occupe l'échelle `commune`,
 * comme en mode commune de l'analyse, et n'est comparé qu'à la France.
 */

import type { EmploymentStats, HouseholdsStats } from "@/server-modules/demographics/domain/insee-profile.types";
import type { CommuneStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import { viewForMode, type InseeView } from "@/components/analysis/inseeChart";
import { FEATURES } from "@/lib/site-features";

export interface CommuneInseeViews {
  employment: InseeView<EmploymentStats> | null;
  households: InseeView<HouseholdsStats> | null;
}

export function communeInseeViews(stats: CommuneStats, nomCourt: string): CommuneInseeViews {
  const scale = { nomCommune: nomCourt, communeIrisCount: 1 };
  return {
    employment: FEATURES.showEmployment ? viewForMode(stats.employment, "commune", scale) : null,
    households: FEATURES.showHouseholds ? viewForMode(stats.households, "commune", scale) : null,
  };
}
