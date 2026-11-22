import type { ArticleMeta } from "../types";
import { REDACTION } from "../authors";

export const meta: ArticleMeta = {
  slug: "zone-tendue-liste-des-communes",
  kind: "guide",
  title: "Zone tendue : la liste des communes et ce que ça change",
  description:
    "1 430 communes en zone tendue, 2 259 en zone touristique : préavis d'un mois, loyer plafonné, taxe sur les logements vacants, résidences secondaires.",
  lead:
    "Ce qu'est une zone tendue, ce qui change pour un locataire et pour un propriétaire selon le zonage de la commune, et où se trouvent les communes concernées.",
  published: "2026-11-22",
  updated: "2026-11-22",
  author: REDACTION,
  sources: [
    {
      nom: "Liste des communes selon le zonage TLV (décret du 22 décembre 2025), ministère de la Transition écologique",
      url: "https://www.data.gouv.fr/datasets/657c88da2947e13be0597058/",
    },
    { nom: "Préavis du locataire, service-public.gouv.fr", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F1168" },
    {
      nom: "Encadrement de l'évolution des loyers, service-public.gouv.fr",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F1314",
    },
    { nom: "Taxe sur les logements vacants, service-public.gouv.fr", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F17293" },
    {
      nom: "Taxe d'habitation des résidences secondaires, service-public.gouv.fr",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F42",
    },
    { nom: "Taux de majoration votés par les communes : fichiers de fiscalité locale de la DGFiP, 2025" },
  ],
  related: [
    { href: "/commune/paris/arrondissements", libelle: "Paris : loyers et prix par arrondissement" },
    { href: "/commune/lyon/arrondissements", libelle: "Lyon : loyers et prix par arrondissement" },
    { href: "/commune/marseille/arrondissements", libelle: "Marseille : loyers et prix par arrondissement" },
  ],
};
