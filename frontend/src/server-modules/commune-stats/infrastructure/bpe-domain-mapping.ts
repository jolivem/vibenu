/**
 * Mapping BPE category (stockée dans bpe_equipment.category) → domaine d'affichage.
 * Les catégories proviennent de scripts/import_bpe.py TYPEQU_MAPPING.
 * Si une catégorie n'est pas listée ici, elle est ignorée à l'affichage.
 *
 * ⚠️ L'inverse est vrai aussi, et sans bruit : une catégorie listée ici que le script
 * ne produit pas donne un domaine silencieusement sous-compté. C'est ce qui arrivait à
 * « Santé », dont neuf des quatorze catégories n'étaient jamais alimentées — `hospital`
 * en tête, alors que les hôpitaux étaient bien en base, rangés sous `doctor`.
 * Toute entrée ajoutée ici doit exister dans TYPEQU_MAPPING, et réciproquement.
 */

import type { EquipmentDomain } from "../domain/commune-stats.types";

export interface DomainConfig {
  domain: EquipmentDomain;
  label: string;
  /** Catégories BPE rattachées (bpe_equipment.category) */
  categories: string[];
}

export const DOMAIN_CONFIG: DomainConfig[] = [
  {
    domain: "alimentaire",
    label: "Alimentation",
    categories: ["supermarket", "bakery", "butcher", "frozen_food", "grocery", "fish_shop"],
  },
  {
    domain: "restauration",
    label: "Restauration",
    categories: ["restaurant"],
  },
  {
    domain: "sante",
    label: "Santé",
    categories: [
      "doctor",
      "specialist",
      "dentist",
      "nurse",
      "physio",
      "speech_therapist",
      "podiatrist",
      "optician",
      "psychologist",
      "lab",
      "hospital",
      "clinic",
      "emergency",
      "pharmacy",
    ],
  },
  {
    domain: "education",
    label: "Éducation",
    categories: ["preschool", "school", "higher_ed"],
  },
  {
    domain: "culture",
    label: "Culture",
    categories: ["library", "cinema", "museum", "theatre", "concert_hall", "bookstore"],
  },
  {
    domain: "sport_loisirs",
    label: "Sports & loisirs",
    // `park` n'a pas d'équivalent dans la BPE 2025 (aucun type « espace vert ») : les
    // parcs viennent d'OSM, qui n'alimente pas cette table.
    categories: ["sport"],
  },
  {
    domain: "services_publics",
    label: "Services publics",
    // Pas de `atm` : la BPE 2025 ne recense pas les distributeurs de billets.
    categories: ["police", "bank", "post_office", "town_hall"],
  },
  {
    domain: "transports",
    label: "Transports",
    // Pas de `metro_station` : la BPE ne recense que les gares de voyageurs
    // (E107 à E109). Métro, tram et bus viennent du module mobilité (GTFS).
    categories: ["rail_station"],
  },
];

const CATEGORY_TO_DOMAIN: Map<string, DomainConfig> = new Map();
for (const cfg of DOMAIN_CONFIG) {
  for (const cat of cfg.categories) {
    CATEGORY_TO_DOMAIN.set(cat, cfg);
  }
}

export function getDomainForCategory(category: string): DomainConfig | undefined {
  return CATEGORY_TO_DOMAIN.get(category);
}

export function getAllDomains(): EquipmentDomain[] {
  return DOMAIN_CONFIG.map((c) => c.domain);
}

export function getDomainLabel(domain: EquipmentDomain): string {
  return DOMAIN_CONFIG.find((c) => c.domain === domain)?.label ?? domain;
}
