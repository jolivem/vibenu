/**
 * Les notes de méthode des pages commune, écrites une seule fois.
 *
 * Elles figuraient sous chaque card des 45 pages d'arrondissement, à l'identique : ~1 100 mots
 * recopiés par page, que Google lisait comme du contenu dupliqué. Chaque card garde sa source
 * en une ligne (`SourceLine`) et renvoie ici, à l'ancre de son sujet.
 *
 * Pages `/commune/*` : français seulement, textes en ligne (règle de CLAUDE.md).
 */

import { map } from "@/i18n/messages/fr/map";
import { HISTORICAL_ERAS } from "@/components/map/historicalLayers";

export const METHODE_SECTIONS = [
  {
    id: "prix",
    titre: "Prix de vente",
    paragraphes: [
      "Les prix viennent des Demandes de valeurs foncières (DVF), publiées par la DGFiP : chaque vente d'appartement ou de maison enregistrée par un notaire, avec son prix et sa surface. Le prix au m² médian partage les ventes en deux moitiés ; il résiste mieux qu'une moyenne aux ventes atypiques.",
      "Les pages d'arrondissement retiennent les appartements vendus au cours des 24 derniers mois. La fourchette donne les seuils des 25 % de ventes les moins chères et des 25 % les plus chères. L'évolution n'est tracée que pour les années comptant au moins 30 ventes.",
      "En Alsace et en Moselle, les ventes relèvent du Livre foncier et ne figurent pas dans DVF.",
    ],
  },
  {
    id: "loyers",
    titre: "Loyers et zone tendue",
    paragraphes: [
      "Les loyers sont des loyers d'annonce, charges comprises, pour des logements non meublés : la « Carte des loyers » de l'ANIL et du ministère du Logement, estimée à partir des annonces publiées sur les principaux sites. Une commune ou un arrondissement trop peu doté en annonces reçoit l'estimation d'un groupe de communes voisines.",
      "Le repère de la ville est la moyenne des arrondissements, pondérée par leur nombre d'annonces.",
      "En zone tendue, le préavis du locataire d'un logement vide est d'un mois au lieu de trois, et le loyer ne peut pas dépasser celui du locataire précédent à la relocation. Le préavis réduit se demande dans la lettre de congé. Le loyer peut dépasser l'ancien à la première mise en location, après plus de 18 mois sans locataire, après des travaux importants ou si l'ancien loyer était manifestement sous-évalué. Le zonage est celui du décret du 22 décembre 2025, publié par le ministère de la Transition écologique.",
    ],
  },
  {
    id: "equipements",
    titre: "Équipements",
    paragraphes: [
      "Les équipements viennent de la Base permanente des équipements (BPE) de l'INSEE : commerces, santé, enseignement, sport, culture, services publics et transports. La densité est rapportée à 10 000 habitants et comparée à la moyenne de la ville ; les écarts inférieurs à 5 % ne sont pas affichés.",
      "La BPE rattache certains équipements à l'adresse de leur gestionnaire plutôt qu'à leur lieu : à l'échelle d'un arrondissement, les nombres peuvent être surestimés ou sous-estimés. L'écart n'est pas calculé quand un arrondissement concentre plus de la moitié des équipements de sa ville dans une catégorie.",
    ],
  },
  {
    id: "securite",
    titre: "Délinquance enregistrée",
    paragraphes: [
      "Les chiffres sont ceux des bases statistiques de la délinquance enregistrée du ministère de l'Intérieur (SSMSI) : des faits enregistrés par la police et la gendarmerie, rapportés à la population ou au nombre de logements. Il s'agit de faits enregistrés, et non commis : la mesure dépend aussi de la propension à porter plainte et de la présence policière.",
      "Les effectifs de 1 à 4 faits ne sont pas publiés (secret statistique) : ils apparaissent en fourchette sur les courbes. Un arrondissement est comparé à sa ville entière et à la France.",
    ],
  },
  {
    id: "population",
    titre: "Population et revenus",
    paragraphes: [
      "L'âge, le revenu médian et le taux de pauvreté sont des moyennes pondérées par la population, calculées à partir des quartiers IRIS de l'INSEE (recensement 2021, Filosofi 2021). La France est agrégée par la même méthode. Le revenu médian est un revenu disponible par unité de consommation.",
    ],
  },
  {
    id: "emploi",
    titre: "Emploi et qualifications",
    paragraphes: [
      "Le taux de chômage du recensement est déclaratif : il compte les personnes qui se déclarent au chômage, et non celles que le Bureau international du travail (BIT) recense comme telles. Il vaut 12,1 % en France, quand le taux du BIT était de 7,9 % en moyenne en 2021 : les deux ne se comparent pas.",
      "Les catégories socioprofessionnelles portent sur les actifs occupés seuls : la catégorie d'un chômeur est celle de son dernier emploi, elle redirait ce que dit déjà le taux de chômage.",
    ],
  },
  {
    id: "logement",
    titre: "Logement et ménages",
    paragraphes: [
      "Le parc de logements et la composition des ménages viennent du recensement de 2021, base logement à l'IRIS. Les effectifs sont des estimations pondérées, arrondies à l'unité : les parts peuvent ne pas boucler exactement à 100 %, d'autant que l'INSEE compte à part les logements qui ne sont ni maison ni appartement.",
      "L'INSEE ne ventile par époque de construction que les logements achevés avant 2019. Un ménage est l'ensemble des personnes d'un même logement, qu'elles aient ou non un lien de parenté.",
    ],
  },
  {
    id: "elections",
    titre: "Élections",
    paragraphes: [
      "Les résultats sont ceux du premier tour de l'élection présidentielle de 2022, publiés par le ministère de l'Intérieur. Les écarts à la France sont exprimés en points de pourcentage des suffrages exprimés, calculés à la même échelle.",
    ],
  },
  {
    id: "qualite-air",
    titre: "Qualité de l'air",
    paragraphes: [
      "L'indice ATMO synthétise chaque jour les concentrations de polluants (particules PM2.5 et PM10, dioxyde d'azote, ozone, dioxyde de soufre) en une catégorie, de « bon » à « extrêmement mauvais ». Il est publié par les associations agréées de surveillance de la qualité de l'air (AirParif, Atmo Auvergne-Rhône-Alpes, AtmoSud) pour la ville entière : il figure donc sur la page de la ville, et non sur celle de chaque arrondissement.",
    ],
  },
  {
    id: "histoire",
    titre: "Cartes anciennes",
    paragraphes: [
      "Les cartes et photographies anciennes sont celles de l'IGN (Géoplateforme), fondues sur la photographie aérienne actuelle.",
      ...HISTORICAL_ERAS.map((era) => {
        const e = map.history.eras[era.id];
        return `${e.label}, ${e.period}. ${e.context}`;
      }),
    ],
  },
] as const;

export type MethodeAnchor = (typeof METHODE_SECTIONS)[number]["id"];
