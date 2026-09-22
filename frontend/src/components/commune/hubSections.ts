/**
 * Les sections des pages hub de ville `/commune/paris|lyon|marseille`.
 *
 * Strictement parallèle à `sections.ts`, et sans aucun import croisé avec lui : les deux
 * taxonomies sont **deux espaces de noms d'ancres disjoints**, et doivent le rester. Une
 * ancre est une adresse publique ; les croiser reviendrait à promettre la même rubrique à
 * deux échelles différentes.
 *
 * C'est aussi le partage de compétence du chantier : ce qui n'est unique qu'à l'échelle de
 * la ville — le climat, les risques, le scrutin municipal — vit ici, et non sur les 45
 * pages d'arrondissement où il serait recopié à l'identique.
 */

import { FEATURES } from "@/lib/site-features";
import type { MunicipalesAnalysis } from "@/server-modules/elections/domain/municipales.types";
import type { RiskAnalysis } from "@/server-modules/risks/domain/risk.types";
import type { ClimateAnalysis } from "@/server-modules/climate/domain/climate.types";

export const CITY_HUB_SECTION_ORDER = [
  // L'annuaire d'abord : c'est ce que le lecteur est venu chercher, et son ancre
  // `#liste` est déjà servie.
  "liste",
  "municipales",
  "climat",
  "risques",
  "faq",
] as const;

export type CityHubSectionId = (typeof CITY_HUB_SECTION_ORDER)[number];

export const CITY_HUB_SECTION_TITLES: Record<CityHubSectionId, string> = {
  liste: "Les arrondissements",
  municipales: "Municipales 2026",
  climat: "Climat",
  risques: "Risques naturels",
  faq: "Questions fréquentes",
};

export interface CityHubSectionInput {
  nbArrondissements: number;
  municipales: MunicipalesAnalysis | null;
  climate: ClimateAnalysis | null;
  risks: RiskAnalysis | null;
  nbFaqItems: number;
  /** Le profil mensuel porte-t-il au moins une mesure ? Tranché par `hasClimateSeries`. */
  climatMesure: boolean;
}

/**
 * Ce que chaque section a réellement à montrer — le point de décision unique du hub,
 * comme `communeSectionContent` l'est pour un arrondissement.
 */
export function cityHubSectionContent({
  nbArrondissements,
  municipales,
  climate,
  risks,
  nbFaqItems,
  climatMesure,
}: CityHubSectionInput): Record<CityHubSectionId, boolean> {
  return {
    liste: nbArrondissements > 0,
    municipales: FEATURES.showMunicipales && (municipales?.listes.length ?? 0) > 0,
    climat: FEATURES.showClimate && climate !== null && climatMesure,
    // Le repli de Géorisques rend trois lignes « Non renseigné » : mieux vaut masquer la
    // rubrique que publier un tableau vide et indexable.
    risques:
      FEATURES.showRisks &&
      (risks?.categories.some((c) => c.level !== "inconnu") ?? false),
    faq: nbFaqItems > 0,
  };
}

/** Les sections à monter, dans l'ordre — ce que lisent le sommaire et le bandeau. */
export function activeCityHubSections(input: CityHubSectionInput): CityHubSectionId[] {
  const content = cityHubSectionContent(input);
  return CITY_HUB_SECTION_ORDER.filter((id) => content[id]);
}
