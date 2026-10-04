import { BRANDING } from "@/lib/site-features";

/**
 * Identité du site pour les moteurs et les réseaux : titre, description, mots-clés. Lu par
 * le layout racine de la langue. Le slogan et la description français viennent de
 * `BRANDING`, qui dépend de la variante de site.
 */
export const site = {
  tagline: BRANDING.tagline,
  description: BRANDING.description,
  keywords: [
    "analyse adresse",
    "immobilier",
    "prix immobilier",
    "DVF",
    "cadastre",
    "PLU",
    "risques naturels",
    "transports",
    "quartier",
    "France",
  ],
};

export type SiteMessages = typeof site;
