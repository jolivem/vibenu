import type { ReactNode } from "react";
import { SECTION_ORDER, type SectionId } from "@/components/analysis/sections";
import type { LandingMessages } from "@/i18n/messages/fr/landing";

/**
 * La vitrine « Ce que vous découvrez » de la page d'accueil.
 *
 * Les cards de la landing SONT les sections de l'écran d'analyse : même ordre, mêmes
 * titres, dérivés du même code. C'est ce qui les empêche de diverger — la liste écrite
 * à la main qu'elles remplacent promettait encore six dimensions quand l'app en livrait
 * neuf, et le `featureList` du JSON-LD annonçait une démographie qu'aucune card ne
 * mentionnait.
 *
 * Ajouter une section à `SECTION_ORDER` casse la compilation tant que son icône (ici) et
 * son texte (`i18n/messages/<langue>/landing.ts`) ne sont pas écrits : les deux sont des
 * `Record<SectionId, …>` exhaustifs.
 */

/** Enfants du `<svg>` : le wrapper est rendu une seule fois par la page. */
const ICONS: Record<SectionId, ReactNode> = {
  immobilier: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  // Devanture de commerce : auvent, corps, porte.
  proximite: (
    <>
      <path d="M4.5 9.5h15V20h-15z" />
      <path d="M3 9.5 4.8 4.5h14.4L21 9.5" />
      <path d="M10 20v-5.5h4V20" />
    </>
  ),
  deplacer: (
    <>
      <rect x="4" y="4" width="16" height="13" rx="2" />
      <path d="M4 11h16M8 17v2M16 17v2" />
      <circle cx="8" cy="14" r="0.8" fill="currentColor" />
      <circle cx="16" cy="14" r="0.8" fill="currentColor" />
    </>
  ),
  // Soleil et nuage : les deux cards de la section quand la qualité de l'air est
  // active. Sans elle, le nuage reste lisible comme un pictogramme météo.
  environnement: (
    <>
      <circle cx="8" cy="7" r="2.8" />
      <path d="M8 1.7v1.3M3.9 7H2.6M5.1 4.1 4.2 3.2M11.8 3.2l-.9.9M5.1 9.9l-.9.9" />
      <path d="M6 19h11a3 3 0 0 0 0-6h-.3a4.5 4.5 0 0 0-8.6-1.1A4 4 0 0 0 6 19z" />
    </>
  ),
  securite: <path d="M12 3.2 19 6v5.4c0 4.2-2.9 7.4-7 9.4-4.1-2-7-5.2-7-9.4V6z" />,
  risques: (
    <>
      <path d="M12 3 2 20h20L12 3z" />
      <path d="M12 10v5M12 17.5v0.5" />
    </>
  ),
  // « Sites industriels classés » plutôt que « risques technologiques », qui
  // contredirait le titre de la section.
  population: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <circle cx="17" cy="8" r="2.2" />
      <path d="M3 20a6 6 0 0 1 12 0M15.5 13.4A5.6 5.6 0 0 1 21 19" />
    </>
  ),
  // Urne et bulletin.
  elections: (
    <>
      <path d="M4 12h16v8H4z" />
      <path d="M8.5 12V5.5h7V12" />
      <path d="M10.5 8.8h3" />
    </>
  ),
  histoire: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 6.8V12l3.6 2.1" />
    </>
  ),
};

export interface LandingFeature {
  id: SectionId;
  title: string;
  icon: ReactNode;
  blurb: string;
  schemaLabel: string;
}

export function buildLandingFeatures(
  m: LandingMessages,
  sectionTitles: Record<SectionId, string>,
  showAirQuality: boolean,
): LandingFeature[] {
  return SECTION_ORDER.map((id) => ({
    id,
    title: sectionTitles[id],
    icon: ICONS[id],
    ...(id === "environnement" && showAirQuality ? m.environnementWithAirQuality : m.features[id]),
  }));
}
