/**
 * Mapping BPE category (stockée dans bpe_equipment.category) → domaine d'affichage.
 * Les catégories proviennent de scripts/import_bpe.py TYPEQU_MAPPING.
 * Si une catégorie n'est pas listée ici, elle est ignorée à l'affichage.
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
    categories: ["sport", "park"],
  },
  {
    domain: "services_publics",
    label: "Services publics",
    categories: ["police", "bank", "atm", "post_office", "town_hall"],
  },
  {
    domain: "transports",
    label: "Transports",
    categories: ["rail_station", "metro_station"],
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
