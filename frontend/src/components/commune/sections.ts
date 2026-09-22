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
    // La card Âge est le plancher de la section ; emploi, ménages et logement ne font que s'y ajouter.
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

/**
 * Les rubriques que la page annonce — dans son chapeau comme dans sa méta-description.
 *
 * Dérivées des drapeaux et non écrites en dur, parce qu'une phrase fixe finit toujours
 * par mentir : le chapeau promettait encore la qualité de l'air longtemps après que le
 * coupe-circuit `NEXT_PUBLIC_HIDE_AIR_QUALITY` l'eut retirée de la page, et il taisait la
 * sécurité, les élections et le logement, qui, eux, s'affichaient. Ces drapeaux sont figés
 * au build, la liste l'est donc aussi — mais elle l'est pour le bon build.
 *
 * L'ordre suit celui des sections. `demographie` en fournit deux, « population » et
 * « logement » : la rubrique rend quatre cards, et ce sont les deux mots que le lecteur
 * cherche. Deux termes séparés plutôt qu'un « population et logement », dont le « et »
 * interne percutait celui de l'énumération.
 */
export function communeRubriquesAnnoncees(): string[] {
  return [
    "prix immobilier",
    "équipements",
    ...(FEATURES.showSecurity ? ["sécurité"] : []),
    "population",
    "logement",
    ...(FEATURES.showElections ? ["élections"] : []),
    ...(FEATURES.showAirQuality ? ["qualité de l'air"] : []),
  ];
}

/** « a, b et c » — l'énumération française, avec « et » devant le dernier terme. */
export function enumererFr(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

/**
 * Coupe une méta-description sur une frontière de mot.
 *
 * Un `slice` brut tranchait au milieu d'un mot et laissait parfois un « et » orphelin en
 * fin de phrase — ce que le moteur affiche tel quel dans ses résultats.
 */
export function tronquerPropre(texte: string, max: number): string {
  if (texte.length <= max) return texte;
  const coupe = texte.slice(0, max);
  const dernierEspace = coupe.lastIndexOf(" ");
  const mots = (dernierEspace > 0 ? coupe.slice(0, dernierEspace) : coupe)
    .replace(/[\s,;:]+$/u, "")
    .replace(/\s+(et|ou|de|du|des|à|au|aux|en|le|la|les|un|une)$/iu, "");
  return `${mots}…`;
}
