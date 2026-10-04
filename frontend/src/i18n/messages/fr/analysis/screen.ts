import { BRANDING } from "@/lib/site-features";

/**
 * L'écran d'analyse lui-même : en-tête, états de chargement, carte de localisation,
 * partage, bouton PDF, notes de pied de page.
 */
export const screen = {
  /** « Analyse · Lyon · 69001 » — la ville et le code postal viennent de l'adresse. */
  eyebrow: (city?: string | null, postcode?: string | null) =>
    `Analyse${city ? ` · ${city}` : ""}${postcode ? ` · ${postcode}` : ""}`,
  /** Titre de l'onglet ; la page n'est pas indexée. */
  metaTitle: "Analyse d'une adresse",
  titleFallback: "Adresse à analyser",
  /** Lien vers la page commune d'un arrondissement ; cette page n'existe qu'en français. */
  communePageLink: (name: string) => `Voir la page ${name} →`,
  loading: "Analyse en cours...",
  /** Affiché quand l'API d'analyse ne répond pas. */
  failed: "Impossible d'analyser cette adresse.",
  locationTitle: "Localisation",
  historyTitle: "Le lieu autrefois",
  /** Aide de la carte des risques, selon ce que le plan de prévention publie pour le lieu. */
  floodHint: {
    zoning:
      "Cochez pour afficher les zones sur la carte. PPR : plan de prévention des risques, le document de l'État qui délimite les zones inondables et y encadre la construction.",
    perimeterOnly:
      "Cochez pour afficher les zones sur la carte. Seul le périmètre du plan de prévention des risques (PPR) d'inondation est publié ici, pas son zonage détaillé.",
    none: "Cochez pour afficher les zones sur la carte. Aucun zonage de plan de prévention des risques (PPR) d'inondation n'est publié ici.",
  },
  aiNotice:
    "Les synthèses « En bref » sont rédigées par une intelligence artificielle à partir des seules données affichées sur cette page. Les chiffres et les sources qui les entourent, eux, proviennent directement des fichiers publics cités.",
  debugSummary: (tokens: number) => `Données envoyées au modèle (debug) — ~${tokens} tokens`,
  backToTop: "Haut de page",
  share: {
    trigger: "Partager",
    panelTitle: "Partager cette analyse",
    linkAria: "Lien de l'analyse",
    copy: "Copier",
    copied: "Copié",
    /** Titre et texte d'accompagnement, pour le partage natif, WhatsApp, X et l'e-mail. */
    title: (label: string) => `${label} — analyse ${BRANDING.name}`,
    text: (label: string) => `Voici l'analyse de ${label} sur ${BRANDING.name} :`,
    emailLabel: "E-mail",
    targetAria: (target: string) => `Partager par ${target}`,
    nativeAria: "Partager via une autre application",
    nativeTitle: "Autre application…",
  },
  pdfButton: {
    idle: "Télécharger PDF",
    generating: "Génération...",
    /** Clic reçu pendant la génération des « En bref » : le PDF part dès leur arrivée. */
    waitingForInsights: "Préparation des synthèses...",
  },
};

export type ScreenMessages = typeof screen;
