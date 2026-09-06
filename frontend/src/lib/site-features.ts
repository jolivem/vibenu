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
  /** Mini-synthèses IA sous le titre des cards à graphiques (« En bref »). */
  showCardInsights: boolean;
  /** Card "Voisinage" — POIs autour de l'adresse. */
  showNeighborhood: boolean;
  /** Card "Sécurité" — délinquance enregistrée SSMSI, maille communale. */
  showSecurity: boolean;
  /** Card "Municipales 2026" — résultats du scrutin local. */
  showMunicipales: boolean;
  /** Card "Transports en commun" — gares, bus, métros à proximité. */
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
  /** Card "Logement" — parc et statut d'occupation, INSEE RP 2021 à l'IRIS. */
  showHousing: boolean;
  /** Card "Emploi et qualifications" — activité, CSP, diplômes, INSEE RP 2021 à l'IRIS. */
  showEmployment: boolean;
  /** Card "Ménages et familles" — composition des foyers, INSEE RP 2021 à l'IRIS. */
  showHouseholds: boolean;
  /** Card "Le lieu autrefois" — cartes et photos aériennes anciennes, IGN Géoplateforme. */
  showHistory: boolean;
  /** Card "Élections" — Présidentielle 2022 T1. */
  showElections: boolean;
  /** Card "Cadastre & urbanisme" — APICarto. */
  showCadastre: boolean;
  /** Card "Carte scolaire" — secteur collège (Paris uniquement pour la donnée). */
  showSchoolSector: boolean;
  /** Card "Localisation" — carte interactive MapLibre + capture dans le PDF. */
  showLocation: boolean;

  // --- Routes & pages ---
  /** Pages SEO /commune/* (hubs + arrondissements). */
  hasSEOPages: boolean;
  /** Section "Explorer par commune" sur la landing page. */
  hasLandingExploreSection: boolean;
  /** Sections marketing "Ce que vous découvrez" + "Comment ça marche" sur la landing. */
  hasLandingMarketingSections: boolean;
  /** Section "Questions fréquentes" (FAQ) sur la landing + JSON-LD FAQPage. */
  hasLandingFaqSection: boolean;
  /** Page /a-propos (mission + sources). Contenu PUBLIC-specific. */
  hasAboutPage: boolean;

  // --- Export PDF ---
  /** Bouton "Télécharger PDF" + génération du PDF. */
  hasPdfExport: boolean;

  // --- Partage ---
  /** Bouton "Partager" sur l'écran d'analyse (lien, e-mail, WhatsApp, partage natif).
   *  Destiné au grand public qui fait circuler une adresse à ses proches. */
  hasShareLinks: boolean;
}

const PUBLIC_FEATURES: SiteFeatures = {
  showCardInsights: true,
  showNeighborhood: true,
  showMobility: true,
  showSecurity: true,
  showRealEstate: true,
  showRisks: true,
  showAirQuality: true,
  showClimate: true,
  showDemographics: true,
  showHousing: true,
  showEmployment: true,
  showHouseholds: true,
  showHistory: true,
  showElections: true,
  showMunicipales: true,
  showCadastre: true,
  showSchoolSector: true,
  showLocation: true,
  hasSEOPages: true,
  hasLandingExploreSection: true,
  hasLandingMarketingSections: true,
  hasLandingFaqSection: true,
  hasAboutPage: true,
  hasPdfExport: true,
  hasShareLinks: true,
};

const PRO_FEATURES: SiteFeatures = {
  showCardInsights: false,
  showNeighborhood: true,
  showMobility: true,
  showSecurity: false, // usage professionnel : hors périmètre
  showRealEstate: false,
  showRisks: false,
  showAirQuality: false,
  showClimate: false,
  showDemographics: false,
  showHousing: false,
  showEmployment: false,
  showHouseholds: false,
  showHistory: false,
  showElections: false,
  showMunicipales: false,
  showCadastre: false,
  showSchoolSector: false,
  showLocation: false,
  hasSEOPages: false,
  hasLandingExploreSection: false,
  hasLandingMarketingSections: false,
  hasLandingFaqSection: false,
  hasAboutPage: false,
  hasPdfExport: true, // PDF simplifié (Voisinage + Mobilité uniquement)
  hasShareLinks: false, // usage professionnel : pas de partage « à des proches »
};

const VARIANT_FEATURES: SiteFeatures = SITE_VARIANT === "PRO" ? PRO_FEATURES : PUBLIC_FEATURES;

/** Même convention que `DISABLE_CACHE` : `1`, `true` ou `yes`. */
function isEnvTrue(value: string | undefined): boolean {
  const v = value?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Coupe-circuits d'env, appliqués **par-dessus** la variante.
 *
 * Ils ne peuvent que retirer une rubrique, jamais en ajouter une : une variante qui ne
 * prévoit pas la qualité de l'air ne doit pas se la voir imposer par une variable
 * d'environnement oubliée sur un serveur.
 *
 * `NEXT_PUBLIC_` est obligatoire : `FEATURES` est lu dans des composants client
 * (`AnalysisScreen`, `SectionNav`), donc la valeur doit être inlinée au build. Elle
 * n'est pas relue à chaud — `next dev` ne recharge pas les `NEXT_PUBLIC_*`, il faut
 * redémarrer.
 */
export const FEATURES: SiteFeatures = {
  ...VARIANT_FEATURES,
  showAirQuality:
    VARIANT_FEATURES.showAirQuality && !isEnvTrue(process.env.NEXT_PUBLIC_HIDE_AIR_QUALITY),
};

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
  // Sert de meta description, de description OG/Twitter ET de lead du hero, lue juste
  // sous le <h1> : elle doit rester une phrase, pas une énumération de douze sources.
  description:
    "Prix, urbanisme, risques, transports, voisinage, climat : ce que les données publiques officielles disent d'une adresse française, en quelques secondes.",
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
