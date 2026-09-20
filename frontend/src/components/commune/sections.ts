/**
 * Les sections des pages SEO arrondissement `/commune/[slug]`.
 *
 * Même rôle que `analysis/sections.ts` pour l'écran d'analyse : une source unique lue par
 * le sommaire, le bandeau de chiffres clés et le corps de la page. Taxonomie distincte,
 * en revanche, et volontairement :
 *
 * - les identifiants sont ceux déjà servis et indexés (`prix-immobilier`, `qualite-air`…),
 *   ce sont des ancres publiques qu'on ne renomme pas pour le plaisir de la symétrie ;
 * - les titres divergent des leurs : la page commune n'a ni climat, ni cadastre, ni PLU.
 *
 * L'ordre, lui, est celui de l'analyse — le logement, puis les gens, puis le cadre
 * physique — pour qu'un lecteur qui passe de l'une à l'autre retrouve son chemin.
 */

import { FEATURES } from "@/lib/site-features";
import type { CommuneStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import { candidatsTop, equipementsAffichables } from "./format";

export const COMMUNE_SECTION_ORDER = [
  "prix-immobilier",
  "equipements",
  "securite",
  "demographie",
  "elections",
  "qualite-air",
  "histoire",
  "faq",
] as const;

export type CommuneSectionId = (typeof COMMUNE_SECTION_ORDER)[number];

export const COMMUNE_SECTION_TITLES: Record<CommuneSectionId, string> = {
  "prix-immobilier": "Prix immobilier",
  equipements: "Équipements & cadre de vie",
  securite: "Sécurité",
  demographie: "Population",
  elections: "Élections",
  "qualite-air": "Qualité de l'air",
  histoire: "Histoire",
  faq: "Questions fréquentes",
};

export interface CommuneSectionInput {
  stats: CommuneStats;
  /** Contour de l'arrondissement : sans lui, pas de fond de carte historique. */
  contour: unknown | null;
  /** Nombre de questions réellement générées — la FAQ n'a pas de contenu propre sans elles. */
  nbFaqItems: number;
}

/**
 * Ce que chaque section a réellement à montrer.
 *
 * C'est **le** point de décision : les cards ne portent plus de garde interne, elles ne
 * sont montées que si leur section est active ici. L'écran d'analyse tient les deux
 * (un `hasContent` dans l'écran, plus le garde de chaque card) et paie cette duplication ;
 * on ne la reproduit pas. Le `Record` est exhaustif : ajouter un id au tuple ci-dessus ne
 * compile pas tant qu'on n'a pas dit à quelle condition il s'affiche.
 */
export function communeSectionContent({
  stats,
  contour,
  nbFaqItems,
}: CommuneSectionInput): Record<CommuneSectionId, boolean> {
  return {
    // Un prix nul n'est pas un prix mais l'absence de ventes connues : une section, une
    // entrée de sommaire et une tuile pour afficher « — » ne valent pas mieux qu'un silence.
    "prix-immobilier": stats.prix.prixM2Median !== null,
    equipements: equipementsAffichables(stats).length > 0,
    securite: FEATURES.showSecurity && stats.securite !== null,
    // La card Âge est le plancher de la section ; emploi et ménages ne font que s'y ajouter.
    demographie: stats.demo.populationTotale > 0,
    elections: FEATURES.showElections && candidatsTop(stats).length > 0,
    "qualite-air":
      FEATURES.showAirQuality && (stats.airQuality?.historique.length ?? 0) > 0,
    histoire: FEATURES.showHistory && contour !== null,
    faq: nbFaqItems > 0,
  };
}

/** Les sections à monter, dans l'ordre — ce que lisent le sommaire et le bandeau. */
export function activeCommuneSections(input: CommuneSectionInput): CommuneSectionId[] {
  const content = communeSectionContent(input);
  return COMMUNE_SECTION_ORDER.filter((id) => content[id]);
}
