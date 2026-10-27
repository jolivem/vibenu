import type { SectionId } from "@/components/analysis/sections";
import { BRANDING } from "@/lib/site-features";
import type { Emphasis } from "../../types";

const COUNT_WORDS = [
  "zéro", "une", "deux", "trois", "quatre", "cinq",
  "six", "sept", "huit", "neuf", "dix", "onze", "douze",
];

interface FaqOptions {
  /** La mention de la source « air » suit la card : l'annoncer quand elle est coupée serait la promettre pour rien. */
  showAirQuality: boolean;
  /** Même règle pour les loyers : ni source annoncée ni question sans la card. */
  showRents: boolean;
  /** Et pour le DPE. */
  showEnergy: boolean;
  hasSEOPages: boolean;
}

/**
 * Page d'accueil. Le slogan, le titre et la description du héros viennent de `BRANDING`,
 * qui dépend de la variante de site (PUBLIC / PRO).
 */
export const landing = {
  nav: {
    howItWorks: "Comment ça marche",
    explore: "Explorer par commune",
    faq: "Questions",
    about: "À propos",
  },
  hero: {
    eyebrow: "Données ouvertes · France",
    title: BRANDING.heroTitle,
    emphasis: BRANDING.heroEmphasis,
    lead: BRANDING.description,
    trust: ["Gratuit", "Sans inscription", "Sources officielles"],
  },
  /** Description du site pour les moteurs (JSON-LD). */
  description: BRANDING.description,
  discover: {
    title: ["Ce que vous ", "découvrez", ""] as Emphasis,
    /** « Neuf dimensions » — dérivé du nombre de sections, pour ne pas laisser un compteur faux. */
    count: (n: number) => {
      const word = COUNT_WORDS[n] ?? String(n);
      return `${word.charAt(0).toUpperCase()}${word.slice(1)} dimensions`;
    },
  },
  /**
   * Une à deux phrases par section, dans le même registre : concret, énuméré, sans
   * superlatif, limites comprises (la carte scolaire n'existe qu'à Paris, la délinquance
   * n'est publiée qu'à la commune). `schemaLabel` alimente le `featureList` du JSON-LD,
   * où le titre seul serait ambigu (« Population », « Histoire »).
   */
  features: {
    immobilier: {
      blurb:
        "Transactions DVF récentes et prix au m², situées sur la carte. Loyers d'annonce et zone tendue. DPE des logements de l'adresse, un par logement. Parcelle cadastrale, zone du PLU et prescriptions d'urbanisme.",
      schemaLabel: "Prix immobiliers DVF, loyers, zone tendue, DPE, cadastre et zonage PLU",
    },
    enseignement: {
      blurb:
        "Les collèges et lycées alentour sur une carte : réussite au brevet et au bac, valeur ajoutée, profil social, langues et sections. À Paris, le collège de secteur.",
      schemaLabel: "Collèges et lycées : résultats, valeur ajoutée, langues",
    },
    proximite: {
      blurb:
        "Écoles, pharmacies, commerces, parcs : les services du quotidien et leur temps à pied.",
      schemaLabel: "Commerces, écoles et services à proximité",
    },
    deplacer: {
      blurb:
        "Bus, tramway, métro, RER, gare. Les arrêts les plus proches et le temps pour s'y rendre à pied.",
      schemaLabel: "Transports en commun et gares",
    },
    environnement: {
      blurb: "Températures, précipitations et ensoleillement mois par mois, normales 1991-2020.",
      schemaLabel: "Climat (normales Météo-France)",
    },
    securite: {
      blurb:
        "Cambriolages, vols, dégradations, violences : dix ans de faits enregistrés par la police et la gendarmerie, à l'échelle de la commune.",
      schemaLabel: "Délinquance enregistrée (SSMSI)",
    },
    risques: {
      // « Sites industriels classés » plutôt que « risques technologiques », qui
      // contredirait le titre de la section.
      blurb:
        "Inondation, retrait-gonflement des argiles, séisme, radon, sites industriels classés. Le niveau d'exposition, superposé à la carte.",
      schemaLabel: "Risques naturels et technologiques (Géorisques)",
    },
    population: {
      blurb:
        "Âges, revenus, diplômes, composition des ménages, parc de logements. Au niveau du quartier IRIS, comparé à la commune et à la France.",
      schemaLabel: "Population, logement et revenus (INSEE, quartier IRIS)",
    },
    elections: {
      blurb:
        "Municipales 2026 et présidentielle 2022 : résultats de la commune, participation, écart avec le vote national.",
      schemaLabel: "Résultats électoraux par commune",
    },
    fiscalite: {
      blurb:
        "Taux de taxe foncière, taxe d'ordures ménagères, droits de mutation à l'achat et comptes de la commune, comparés aux communes de taille comparable.",
      schemaLabel: "Fiscalité locale et finances de la commune",
    },
    histoire: {
      blurb:
        "L'adresse sur les cartes et les photographies aériennes anciennes de l'IGN, de Cassini à aujourd'hui, avec le contour de la parcelle.",
      schemaLabel: "Cartes et photographies aériennes anciennes (IGN)",
    },
  } satisfies Record<SectionId, { blurb: string; schemaLabel: string }> as Record<
    SectionId,
    { blurb: string; schemaLabel: string }
  >,
  /** Variante de la section « environnement » quand la qualité de l'air est affichée. */
  environnementWithAirQuality: {
    blurb:
      "Températures, précipitations et ensoleillement mois par mois, normales 1991-2020. Indice quotidien de qualité de l'air des derniers jours.",
    schemaLabel: "Climat (normales Météo-France) et qualité de l'air",
  },
  steps: {
    title: ["Comment ça ", "marche", ""] as Emphasis,
    meta: "Trois étapes",
    items: [
      {
        title: "Saisissez l'adresse",
        text: "N'importe quelle adresse française, du studio parisien à la maison en province.",
      },
      {
        title: "L'analyse se lance",
        text: "Croisement automatique des bases publiques en quelques secondes.",
      },
      {
        title: "Décidez sereinement",
        text: "Carte interactive et indicateurs pour louer ou acheter en connaissance de cause.",
      },
    ],
  },
  explore: {
    title: ["Explorer par ", "commune", ""] as Emphasis,
    meta: "Pages dédiées · données agrégées",
    /** Mention ajoutée aux cartes quand les pages liées ne sont pas dans la langue courante. */
    languageNote: null as string | null,
    cities: {
      paris: {
        region: "Île-de-France",
        name: "Paris",
        text: "Les 20 arrondissements analysés : prix immobilier, démographie, équipements, qualité de l'air et résultats électoraux.",
        cta: "Découvrir les 20 arrondissements →",
      },
      lyon: {
        region: "Auvergne-Rhône-Alpes",
        name: "Lyon",
        text: "Les 9 arrondissements analysés : prix, démographie, équipements, qualité de l'air.",
        cta: "Découvrir les 9 arrondissements →",
      },
      marseille: {
        region: "Provence-Alpes-Côte d'Azur",
        name: "Marseille",
        text: "Les 16 arrondissements analysés : prix, démographie, équipements, qualité de l'air.",
        cta: "Découvrir les 16 arrondissements →",
      },
    },
    soon: {
      eyebrow: "Bientôt",
      name: "Top 500 communes",
      text: "Toutes les villes françaises de plus de 20 000 habitants.",
      cta: "En préparation",
    },
  },
  faq: {
    title: ["Questions ", "fréquentes", ""] as Emphasis,
    meta: "À propos du service",
    /**
     * Les réponses partent aussi en `FAQPage` JSON-LD, donc potentiellement en extrait de
     * résultat Google : elles n'énumèrent que ce qui s'affiche réellement.
     */
    items: ({ showAirQuality, showRents, showEnergy, hasSEOPages }: FaqOptions) => [
      {
        question: `${BRANDING.name} est-il gratuit ?`,
        answer:
          "Oui. L'analyse d'une adresse française est entièrement gratuite et sans inscription. Le service s'appuie sur des données publiques ouvertes.",
      },
      {
        question: "D'où viennent les données affichées ?",
        answer:
          "Tous les chiffres proviennent de sources publiques officielles : DVF (DGFiP) pour les prix immobiliers, " +
          (showRents ? "l'ANIL pour les loyers, le ministère de la Transition écologique pour la zone tendue, " : "") +
          (showEnergy ? "l'ADEME pour les diagnostics de performance énergétique (DPE), " : "") +
          "Géorisques pour les risques naturels et technologiques, l'IGN et le Géoportail de l'Urbanisme pour les parcelles, le PLU et les zonages des plans de prévention du risque d'inondation, l'INSEE pour la population, les revenus, l'emploi et les logements, la Base Permanente des Équipements de l'INSEE et OpenStreetMap pour les commerces et services de proximité, transport.data.gouv.fr pour les transports, Météo-France pour le climat, " +
          (showAirQuality ? "l'Agence européenne de l'environnement pour la qualité de l'air, " : "") +
          "le SSMSI pour la délinquance, le ministère de l'Intérieur pour les élections, le ministère de l'Éducation nationale pour les collèges et lycées, la Ville de Paris pour la carte scolaire, et l'IGN pour la recherche d'adresse, les fonds de carte et les vues aériennes anciennes. Chaque chiffre reste rattaché à sa source et à sa date de publication. Seules les phrases « En bref », sous les titres de rubriques, sont rédigées par un modèle de langage : il reformule ces mêmes chiffres, il n'en invente aucun.",
      },
      {
        question: "Quelles adresses puis-je analyser ?",
        answer:
          "N'importe quelle adresse située en France métropolitaine et dans les départements et régions d'outre-mer, du studio parisien à la maison en province.",
      },
      {
        question: "Puis-je analyser une commune entière ?",
        answer:
          "Oui : saisissez un nom de commune au lieu d'une adresse. L'analyse passe à l'échelle communale — prix au m² sur toute la commune, population, sécurité, élections, climat et risques naturels. Ce qui n'a de sens qu'en un point précis disparaît alors : parcelle cadastrale, zone PLU, commerces à distance de marche et secteur de collège." +
          (hasSEOPages
            ? " Paris, Lyon et Marseille font exception : chercher la ville entière ouvre une page qui liste ses arrondissements, car l'INSEE et les bases d'équipements ne publient leurs chiffres qu'arrondissement par arrondissement — un prix moyen « Paris » n'existe pas dans ces données. Chaque arrondissement a ensuite sa propre page et son analyse détaillée, accessibles depuis « Explorer par commune »."
            : ""),
      },
      {
        question: "Combien de temps prend une analyse ?",
        answer: `Quelques secondes. ${BRANDING.name} interroge en parallèle les bases publiques et agrège les résultats sur une carte interactive.`,
      },
      {
        question: "Où trouver le prix au m² des ventes autour d'une adresse ?",
        answer:
          "Dans la rubrique Immobilier. Saisissez l'adresse : les ventes des dix dernières années à moins d'un kilomètre, enregistrées dans la base publique DVF, s'affichent sur la carte avec leur prix, leur surface et leur date, et le prix médian au m² en est tiré.",
      },
      ...(showEnergy
        ? [
            {
              question: "Comment connaître le DPE d'un logement à partir de son adresse ?",
              answer:
                "Saisissez l'adresse : la rubrique « Performance énergétique » liste les diagnostics enregistrés par l'ADEME à cette adresse depuis juillet 2021, un par logement, avec la date, la surface, la classe DPE, les émissions et la consommation. Dans un immeuble, la surface permet de retrouver un appartement. Chaque diagnostic porte son numéro ADEME, qui permet de le vérifier sur l'observatoire DPE de l'ADEME.",
            },
          ]
        : []),
      {
        question: "Comment savoir si une adresse est en zone inondable ?",
        answer:
          "La rubrique Risques indique, d'après Géorisques, l'exposition de l'adresse aux inondations par débordement de cours d'eau et par remontée de nappe, et la carte montre les zonages des plans de prévention du risque d'inondation publiés sur le Géoportail de l'Urbanisme. Le zonage porte sur un secteur : ce qu'un logement subit dépend surtout de son étage et de la présence d'un sous-sol.",
      },
      ...(showRents
        ? [
            {
              question: "Comment savoir si une commune est en zone tendue ?",
              answer:
                "La rubrique Loyers l'indique, d'après le zonage publié par le ministère de la Transition écologique (décret du 22 décembre 2025). En zone tendue, le préavis du locataire d'un logement vide passe à un mois et, à la relocation, le loyer ne peut pas dépasser celui du locataire précédent. La « zone touristique et tendue » ne change que la fiscalité locale.",
            },
          ]
        : []),
      {
        question: "Les prix au m² sont-ils fiables ?",
        answer:
          "Les prix proviennent de la base DVF (Demandes de Valeurs Foncières) publiée par l'État, qui recense les transactions immobilières réelles enregistrées chez les notaires. Les chiffres correspondent à des ventes effectivement réalisées.",
      },
      ...(showRents
        ? [
            {
              question: "D'où viennent les loyers affichés ?",
              answer:
                "De la « Carte des loyers » publiée par l'ANIL et le ministère du Logement, estimée à partir de millions d'annonces de location. Ce sont des loyers d'annonce au m², charges comprises, pour un logement non meublé, donnés par commune — et par arrondissement à Paris, Lyon et Marseille — pour les appartements selon leur taille et pour les maisons, avec une fourchette. Dans les petites communes, faute d'annonces suffisantes, l'estimation porte sur un groupe de communes voisines, et l'analyse le signale. Le loyer finalement signé peut différer du loyer annoncé.",
            },
          ]
        : []),
    ],
  },
  footer: {
    baseline: "Données ouvertes françaises · Gratuit, sans inscription",
  },
};

export type LandingMessages = typeof landing;
