import type { SectionId } from "@/components/analysis/sections";

/**
 * Titres des sections de l'écran d'analyse, repris par le sommaire, le PDF et la vitrine
 * de la page d'accueil. Les identifiants (`immobilier`, `deplacer`…) sont techniques et ne
 * se traduisent pas : ce sont des ancres déjà partagées par lien.
 */
export const sections = {
  titles: {
    immobilier: "Immobilier & urbanisme",
    deplacer: "Se déplacer",
    proximite: "À proximité",
    environnement: "Climat",
    securite: "Sécurité",
    // « Risques » seul serait ambigu depuis l'arrivée de « Sécurité » dans la page :
    // l'adjectif tranche entre aléa naturel et fait social.
    risques: "Risques naturels",
    population: "Population",
    elections: "Élections",
    histoire: "Histoire",
  } satisfies Record<SectionId, string> as Record<SectionId, string>,
  /**
   * Titre de la section « environnement » quand la card de qualité de l'air est active :
   * le titre suit ce que la section contient réellement — annoncer la qualité de l'air
   * quand elle est coupée serait la promettre pour rien.
   */
  environnementWithAirQuality: "Climat & qualité de l'air",
};

export type SectionsMessages = typeof sections;
