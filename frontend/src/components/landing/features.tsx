import type { ReactNode } from "react";
import { SECTION_ORDER, SECTION_TITLES, type SectionId } from "@/components/analysis/sections";

/**
 * La vitrine « Ce que vous découvrez » de la page d'accueil.
 *
 * Les cards de la landing SONT les sections de l'écran d'analyse : même ordre, mêmes
 * titres, dérivés du même code. C'est ce qui les empêche de diverger — la liste écrite
 * à la main qu'elles remplacent promettait encore six dimensions quand l'app en livrait
 * neuf, et le `featureList` du JSON-LD annonçait une démographie qu'aucune card ne
 * mentionnait.
 *
 * Ajouter une section à `SECTION_ORDER` casse désormais la compilation ici tant que sa
 * card n'est pas écrite : `CONTENT` est un `Record<SectionId, …>` exhaustif.
 *
 * Les textes disent ce que chaque section contient réellement, y compris ses limites —
 * la carte scolaire n'existe qu'à Paris, la délinquance n'est publiée qu'à la commune.
 * Promettre au-delà se paierait à la première analyse.
 */

interface FeatureContent {
  /** Enfants du `<svg>` : le wrapper est rendu une seule fois par la page. */
  icon: ReactNode;
  /** Une à deux phrases, dans le registre des autres : concret, énuméré, sans superlatif. */
  blurb: string;
  /** Libellé du `featureList` JSON-LD — plus explicite que le titre seul, qui y serait
   *  ambigu hors contexte (« Population », « Histoire »). */
  schemaLabel: string;
}

const CONTENT: Record<SectionId, FeatureContent> = {
  immobilier: {
    icon: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
    blurb:
      "Transactions DVF récentes et prix au m², situées sur la carte. Parcelle cadastrale, zone du PLU et prescriptions d'urbanisme.",
    schemaLabel: "Prix immobiliers DVF, cadastre et zonage PLU",
  },
  proximite: {
    // Devanture de commerce : auvent, corps, porte.
    icon: (
      <>
        <path d="M4.5 9.5h15V20h-15z" />
        <path d="M3 9.5 4.8 4.5h14.4L21 9.5" />
        <path d="M10 20v-5.5h4V20" />
      </>
    ),
    blurb:
      "Écoles, pharmacies, commerces, parcs : les services du quotidien et leur temps à pied. À Paris, le collège de secteur.",
    schemaLabel: "Commerces, écoles et services à proximité",
  },
  deplacer: {
    icon: (
      <>
        <rect x="4" y="4" width="16" height="13" rx="2" />
        <path d="M4 11h16M8 17v2M16 17v2" />
        <circle cx="8" cy="14" r="0.8" fill="currentColor" />
        <circle cx="16" cy="14" r="0.8" fill="currentColor" />
      </>
    ),
    blurb:
      "Bus, tramway, métro, RER, gare. Les arrêts les plus proches et le temps pour s'y rendre à pied.",
    schemaLabel: "Transports en commun et gares",
  },
  environnement: {
    // Soleil et nuage : les deux cards de la section, le climat et l'air.
    icon: (
      <>
        <circle cx="8" cy="7" r="2.8" />
        <path d="M8 1.7v1.3M3.9 7H2.6M5.1 4.1 4.2 3.2M11.8 3.2l-.9.9M5.1 9.9l-.9.9" />
        <path d="M6 19h11a3 3 0 0 0 0-6h-.3a4.5 4.5 0 0 0-8.6-1.1A4 4 0 0 0 6 19z" />
      </>
    ),
    blurb:
      "Températures, précipitations et ensoleillement mois par mois, normales 1991-2020. Indice quotidien de qualité de l'air des derniers jours.",
    schemaLabel: "Climat (normales Météo-France) et qualité de l'air",
  },
  securite: {
    icon: <path d="M12 3.2 19 6v5.4c0 4.2-2.9 7.4-7 9.4-4.1-2-7-5.2-7-9.4V6z" />,
    blurb:
      "Cambriolages, vols, dégradations, violences : dix ans de faits enregistrés par la police et la gendarmerie, à l'échelle de la commune.",
    schemaLabel: "Délinquance enregistrée (SSMSI)",
  },
  risques: {
    icon: (
      <>
        <path d="M12 3 2 20h20L12 3z" />
        <path d="M12 10v5M12 17.5v0.5" />
      </>
    ),
    // « Sites industriels classés » plutôt que « risques technologiques », qui
    // contredirait le titre de la section.
    blurb:
      "Inondation, retrait-gonflement des argiles, séisme, radon, sites industriels classés. Le niveau d'exposition, superposé à la carte.",
    schemaLabel: "Risques naturels et technologiques (Géorisques)",
  },
  population: {
    icon: (
      <>
        <circle cx="9" cy="8.5" r="3.2" />
        <circle cx="17" cy="8" r="2.2" />
        <path d="M3 20a6 6 0 0 1 12 0M15.5 13.4A5.6 5.6 0 0 1 21 19" />
      </>
    ),
    blurb:
      "Âges, revenus, diplômes, composition des ménages, parc de logements. Au niveau du quartier IRIS, comparé à la commune et à la France.",
    schemaLabel: "Population, logement et revenus (INSEE, quartier IRIS)",
  },
  elections: {
    // Urne et bulletin.
    icon: (
      <>
        <path d="M4 12h16v8H4z" />
        <path d="M8.5 12V5.5h7V12" />
        <path d="M10.5 8.8h3" />
      </>
    ),
    blurb:
      "Municipales 2026 et présidentielle 2022 : résultats de la commune, participation, écart avec le vote national.",
    schemaLabel: "Résultats électoraux par commune",
  },
  histoire: {
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 6.8V12l3.6 2.1" />
      </>
    ),
    blurb:
      "L'adresse sur les cartes et les photographies aériennes anciennes de l'IGN, de Cassini à aujourd'hui, avec le contour de la parcelle.",
    schemaLabel: "Cartes et photographies aériennes anciennes (IGN)",
  },
};

export const LANDING_FEATURES = SECTION_ORDER.map((id) => ({
  id,
  title: SECTION_TITLES[id],
  ...CONTENT[id],
}));

const COUNT_WORDS = [
  "zéro", "une", "deux", "trois", "quatre", "cinq",
  "six", "sept", "huit", "neuf", "dix", "onze", "douze",
];

/**
 * « Neuf dimensions » — dérivé, pour qu'une section ajoutée ne laisse pas derrière elle
 * un compteur faux. C'est exactement ce qui était arrivé au précédent.
 */
export const FEATURES_COUNT_LABEL = (() => {
  const n = LANDING_FEATURES.length;
  const word = COUNT_WORDS[n] ?? String(n);
  return `${word.charAt(0).toUpperCase()}${word.slice(1)} dimensions`;
})();
