/**
 * Configuration centrale des variantes du site.
 *
 * Deux variantes coexistent dans le même codebase :
 * - PUBLIC : version grand public complète (toutes les cards, pages SEO, narrative LLM)
 * - PRO    : version simplifiée pour usage professionnel (voisinage + mobilité uniquement)
 *
 * Sélection par variable d'env NEXT_PUBLIC_SITE_VARIANT (=PRO|PUBLIC).
 * Default = PUBLIC pour compatibilité ascendante.
 *
 * Toute la logique de variante passe par cet objet — pour ne pas oublier de gater
 * une feature, ajouter une nouvelle clé ici puis l'utiliser dans le code.
 */

export type SiteVariant = "PUBLIC" | "PRO";

const rawVariant = process.env.NEXT_PUBLIC_SITE_VARIANT?.toUpperCase();
export const SITE_VARIANT: SiteVariant = rawVariant === "PRO" ? "PRO" : "PUBLIC";

export const isPro = SITE_VARIANT === "PRO";
export const isPublic = SITE_VARIANT === "PUBLIC";

/**
 * Drapeaux de features. Chaque entrée doit être documentée brièvement.
 * Pour ajouter une variante, modifier ces deux objets puis utiliser FEATURES.x dans le code.
 */
export interface SiteFeatures {
  // --- Cards de l'écran d'analyse (mode adresse + commune) ---
  /** Card "Synthèse" (narratif rédigé par Mistral). */
  showNarrative: boolean;
  /** Card "Voisinage" — POIs autour de l'adresse. */
  showNeighborhood: boolean;
  /** Card "Mobilité" — gares, bus, métros à proximité. */
  showMobility: boolean;
  /** Card "Marché immobilier" — DVF. */
  showRealEstate: boolean;
  /** Card "Risques" — Géorisques. */
  showRisks: boolean;
  /** Card "Qualité de l'air" — Atmo. */
  showAirQuality: boolean;
  /** Card "Climat" — normales Météo-France. */
  showClimate: boolean;
  /** Card "Démographie" — INSEE IRIS. */
  showDemographics: boolean;
  /** Card "Élections" — Présidentielle 2022 T1. */
  showElections: boolean;
  /** Card "Cadastre & urbanisme" — APICarto. */
  showCadastre: boolean;
  /** Card "Carte scolaire" — secteur collège (Paris uniquement pour la donnée). */
  showSchoolSector: boolean;

  // --- Routes & pages ---
  /** Pages SEO /commune/* (hubs + arrondissements). */
  hasSEOPages: boolean;
  /** Section "Explorer par commune" sur la landing page. */
  hasLandingExploreSection: boolean;
  /** Page /a-propos (mission + sources). Contenu PUBLIC-specific. */
  hasAboutPage: boolean;

  // --- Export PDF ---
  /** Bouton "Télécharger PDF" + génération du PDF. */
  hasPdfExport: boolean;
}

const PUBLIC_FEATURES: SiteFeatures = {
  showNarrative: true,
  showNeighborhood: true,
  showMobility: true,
  showRealEstate: true,
  showRisks: true,
  showAirQuality: true,
  showClimate: true,
  showDemographics: true,
  showElections: true,
  showCadastre: true,
  showSchoolSector: true,
  hasSEOPages: true,
  hasLandingExploreSection: true,
  hasAboutPage: true,
  hasPdfExport: true,
};

const PRO_FEATURES: SiteFeatures = {
  showNarrative: false,
  showNeighborhood: true,
  showMobility: true,
  showRealEstate: false,
  showRisks: false,
  showAirQuality: false,
  showClimate: false,
  showDemographics: false,
  showElections: false,
  showCadastre: false,
  showSchoolSector: false,
  hasSEOPages: false,
  hasLandingExploreSection: false,
  hasAboutPage: false,
  hasPdfExport: true, // PDF simplifié (Voisinage + Mobilité uniquement)
};

export const FEATURES: SiteFeatures = SITE_VARIANT === "PRO" ? PRO_FEATURES : PUBLIC_FEATURES;

/**
 * Branding du site (nom, logo splitté, tagline, accroche hero).
 * Une fois le nom PRO définitif choisi, modifier `PRO_BRANDING` ci-dessous.
 *
 * Note : le domaine (URL canonique) reste géré par la variable d'env SITE_URL
 * (passée en build-arg Docker), pour pouvoir déployer la même variante sur
 * plusieurs domaines de staging/prod.
 */
export interface SiteBranding {
  /** Nom complet (apparaît dans <title>, JSON-LD, OG, PDF author…). */
  name: string;
  /** Première partie du logo splitté (rendu normal). */
  brandFirst: string;
  /** Seconde partie du logo splitté (rendu en italique/span). */
  brandSecond: string;
  /** Tagline (utilisée dans le <title> de la home + meta description courte). */
  tagline: string;
  /** Description meta (~150 chars). */
  description: string;
  /** Hero principal de la landing — partie en haut, gras. */
  heroTitle: string;
  /** Hero principal — partie en italique (ligne suivante). */
  heroEmphasis: string;
}

const PUBLIC_BRANDING: SiteBranding = {
  name: "ClaireAdresse",
  brandFirst: "Claire",
  brandSecond: "Adresse",
  tagline: "Analysez une adresse avant de louer ou acheter",
  description:
    "Transports, risques, cadastre, prix immobiliers, urbanisme. Toutes les informations clés sur une adresse en France, en quelques secondes.",
  heroTitle: "Analysez une adresse",
  heroEmphasis: "avant de louer ou acheter.",
};

// TODO : remplacer "ProSite" / "Pro" / "Site" par le nom définitif quand il sera arrêté.
const PRO_BRANDING: SiteBranding = {
  name: "ProClaireAdresse",
  brandFirst: "Pro",
  brandSecond: "ClaireAdresse",
  tagline: "Mobilité et voisinage — analyse rapide d'une adresse",
  description:
    "Pour les pros : aperçu rapide des transports et du voisinage d'une adresse française. Données publiques officielles, sans inscription.",
  heroTitle: "Mobilité et voisinage",
  heroEmphasis: "d'une adresse en quelques secondes.",
};

export const BRANDING: SiteBranding = SITE_VARIANT === "PRO" ? PRO_BRANDING : PUBLIC_BRANDING;
