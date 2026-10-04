import type { Emphasis, Rich } from "../../types";

/** Page « À propos » : mission, sources, méthodologie, limites, presse. */
export const about = {
  meta: {
    title: "À propos — La mission de ClaireAdresse",
    description:
      "ClaireAdresse agrège les données publiques françaises (DVF, Géorisques, cadastre, INSEE) pour aider locataires et acheteurs à analyser une adresse avant de s'engager.",
    openGraphDescription:
      "Pourquoi ClaireAdresse existe, quelles données nous utilisons et comment nous garantissons leur fiabilité.",
    schemaName: "À propos de ClaireAdresse",
    schemaDescription:
      "Mission, sources de données et méthodologie du service d'analyse d'adresses ClaireAdresse.",
  },
  hero: {
    eyebrow: "À propos",
    title: "La donnée publique,",
    emphasis: "lisible par tous.",
    lead: "ClaireAdresse rassemble en un seul écran les informations dispersées entre une douzaine de bases publiques françaises. Notre objectif : permettre à toute personne qui s'apprête à louer ou acheter de comprendre un quartier en quelques secondes, sans naviguer entre dix sites administratifs.",
  },
  mission: {
    title: ["Notre ", "mission", ""] as Emphasis,
    meta: "Pourquoi ce service",
    paragraphs: [
      "L'information sur les logements existe — elle est même publique. Mais elle reste fragmentée entre Géorisques pour les risques naturels, DVF pour les prix, le Géoportail de l'Urbanisme pour le PLU, l'INSEE pour la démographie, transport.data.gouv.fr pour la mobilité, Météo-France pour le climat, le ministère de l'Intérieur pour les scrutins. Croiser tout cela avant une visite ou une signature prend des heures.",
      "ClaireAdresse fait ce travail à votre place. Vous saisissez une adresse, nous interrogeons les sources officielles et nous présentons une synthèse claire sur une carte. Le service est gratuit, sans inscription et utilisable depuis n'importe quel navigateur.",
    ] as Rich[],
  },
  sources: {
    title: ["Nos ", "sources", ""] as Emphasis,
    meta: "Données ouvertes",
    /**
     * `id: "air"` marque la source retirée quand la card de qualité de l'air est coupée :
     * cette liste décrit ce que le visiteur verra, pas ce que le code sait interroger.
     */
    items: [
      {
        name: "DVF",
        issuer: "DGFiP / data.gouv.fr",
        desc: "Demandes de Valeurs Foncières — toutes les transactions immobilières enregistrées en France depuis 2014.",
      },
      {
        name: "Géorisques",
        issuer: "BRGM · Ministère de la Transition écologique",
        desc: "Dix-huit aléas lus à l'adresse : inondation, retrait-gonflement des argiles, séisme, radon, mouvements de terrain, feu de forêt, installations classées, pollution des sols, rupture de barrage, risque minier…",
      },
      {
        name: "Cadastre & urbanisme",
        issuer: "IGN · Géoportail de l'Urbanisme",
        desc: "Parcelles cadastrales, zonages d'urbanisme (PLU, PLUi, cartes communales) et servitudes d'utilité publique — dont les zonages des plans de prévention du risque d'inondation cartographiés sur la carte des risques.",
      },
      {
        name: "Recensement & revenus",
        issuer: "INSEE — RP 2021, Filosofi",
        desc: "Population, logement, emploi, diplômes et revenus au niveau de l'IRIS, l'îlot statistique qui découpe les communes en quartiers.",
      },
      {
        name: "Commerces & équipements",
        issuer: "INSEE (BPE) · OpenStreetMap",
        desc: "Écoles, pharmacies, médecins, commerces, parcs et équipements sportifs autour de l'adresse, avec leur distance.",
      },
      {
        name: "Transports",
        issuer: "transport.data.gouv.fr",
        desc: "Arrêts de bus, métro, tramway, RER et gares ferroviaires issus des bases GTFS des autorités organisatrices.",
      },
      {
        name: "Normales climatiques",
        issuer: "Météo-France · meteo.data.gouv.fr",
        desc: "Températures, précipitations et ensoleillement mois par mois sur la période de référence 1991-2020, par station.",
      },
      {
        id: "air",
        name: "Qualité de l'air",
        issuer: "Atmo France · LCSQA",
        desc: "Indice quotidien de qualité de l'air et stations de mesure les plus proches.",
      },
      {
        name: "Délinquance enregistrée",
        issuer: "SSMSI · Ministère de l'Intérieur",
        desc: "Faits enregistrés par la police et la gendarmerie sur dix ans, à la maille communale — la plus fine qui soit publiée.",
      },
      {
        name: "Fiscalité locale",
        issuer: "DGFiP · data.economie.gouv.fr",
        desc: "Taux de taxe foncière et d'ordures ménagères, résidences secondaires, droits de mutation et comptes des communes.",
      },
      {
        name: "Résultats électoraux",
        issuer: "Ministère de l'Intérieur / data.gouv.fr",
        desc: "Municipales 2026 et présidentielle 2022, agrégés à la commune et à l'arrondissement.",
      },
      {
        name: "Adresses & fonds de carte",
        issuer: "IGN · Géoplateforme (BAN)",
        desc: "Recherche d'adresse, géocodage, plans de rue vectoriels, photographies aériennes et ombrage LiDAR du relief.",
      },
      {
        name: "Cartes anciennes",
        issuer: "IGN · Géoplateforme",
        desc: "Carte de Cassini, carte de l'état-major et photographies aériennes depuis les années 1950.",
      },
      {
        name: "Carte scolaire",
        issuer: "Ville de Paris — opendata.paris.fr",
        desc: "Secteurs de collège, disponibles pour Paris uniquement.",
      },
    ] as Array<{ id?: "air"; name: string; issuer: string; desc: string }>,
  },
  method: {
    title: ["Notre ", "méthodologie", ""] as Emphasis,
    meta: "Comment nous traitons la donnée",
    paragraphs: [
      "Nous ne réinventons pas la donnée : nous la relayons. Chaque indicateur affiché renvoie à une source officielle vérifiable. Les prix au m² proviennent uniquement de transactions réelles enregistrées chez les notaires (DVF). Les risques sont ceux publiés par les services de l'État. Les zonages d'urbanisme correspondent à ceux téléversés par les communes sur le Géoportail de l'Urbanisme.",
      "Les phrases « En bref », sous les titres de rubriques, sont les seules à être rédigées par un modèle de langage. Le partage des rôles y est strict : les tendances, les écarts à la moyenne nationale et les valeurs extrêmes sont calculés par le programme, à partir de seuils explicites ; le modèle ne reçoit que ces conclusions — « en baisse de 31 % », jamais dix nombres bruts — et les met en français. Il reformule, il ne calcule pas et n'ajoute aucun chiffre. Quand il n'est pas disponible, la rubrique s'affiche simplement sans sa phrase.",
      [
        "Deux lectures coexistent sur les risques, et elles ne disent pas la même chose. La liste des aléas est lue ",
        { strong: "à l'adresse" },
        " : elle répond « ce logement est-il concerné ». La carte, elle, montre les zonages ",
        { strong: "autour" },
        " du lieu. Un logement hors zone inondable peut donc très bien voir une zone passer à quelques rues — ce n'est pas une contradiction, c'est la différence entre le point et son voisinage.",
      ],
      "Nous indiquons systématiquement la date de mise à jour de chaque source. Lorsque la donnée n'est pas disponible pour une adresse (commune n'ayant pas encore publié son PLU, transactions DVF rares en zone peu dense), nous le signalons plutôt que de masquer l'information.",
    ] as Rich[],
  },
  limits: {
    title: ["Les ", "limites", " de l'exercice"] as Emphasis,
    meta: "À lire avant de décider",
    paragraphs: [
      "Les données publiques ne sont pas infaillibles. Elles peuvent être erronées, incomplètes ou en retard sur le terrain : un commerce fermé figure encore dans l'inventaire des équipements, une vente n'apparaît dans DVF que plusieurs mois après la signature, un plan de prévention des risques n'est parfois publié que par son périmètre. Nous corrigeons ce que nous repérons, sans pouvoir garantir l'exactitude de chaque chiffre.",
      "La plupart des indicateurs décrivent en outre une zone plus large que le logement : un quartier IRIS, une commune, un rayon autour de l'adresse. Ils disent ce qui entoure un bien, pas l'état du bien lui-même.",
      "ClaireAdresse est un point de départ, pas un avis. Avant toute décision — achat, location, travaux —, recoupez ces informations sur place, par une visite, si possible à différentes heures, et auprès des sources locales : la mairie pour le PLU et les projets à venir, l'état des risques annexé à la promesse de vente ou au bail, les diagnostics techniques, le notaire, l'agence, le voisinage.",
    ] as Rich[],
  },
  press: {
    title: ["", "Presse", ""] as Emphasis,
    meta: "Pour les journalistes",
    paragraphs: [
      "ClaireAdresse est un site gratuit et sans inscription qui rassemble sur une carte ce que les données publiques disent d'une adresse ou d'une commune française : prix réels des ventes, risques, urbanisme, transports, équipements, population, délinquance, climat, élections, photographies aériennes anciennes. Chaque indicateur est montré dans son unité et comparé à un repère, sans score global. Le site est développé et édité par un particulier.",
    ] as Rich[],
    /** Dernier paragraphe, autour de l'adresse de contact : `[avant le lien, après]`. */
    contact: [
      "Sur demande : l'analyse d'une adresse ou d'un quartier de votre choix, des chiffres calculés sur un territoire à partir des mêmes données, des captures d'écran et le logo. Écrivez à ",
      ".",
    ] as readonly [string, string],
  },
  /**
   * Glossaire du jargon administratif français, pour les lecteurs d'une autre langue.
   * `null` en français : ces termes y sont expliqués là où ils apparaissent.
   */
  glossary: null as {
    title: Emphasis;
    meta: string;
    items: Array<{ term: string; definition: string }>;
  } | null,
  footer: {
    analyze: "Analyser une adresse",
    contact: "Contact",
  },
};

export type AboutMessages = typeof about;
