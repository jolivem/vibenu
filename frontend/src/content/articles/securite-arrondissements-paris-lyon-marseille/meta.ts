import type { ArticleMeta } from "../types";
import { REDACTION } from "../authors";

export const meta: ArticleMeta = {
  slug: "securite-arrondissements-paris-lyon-marseille",
  kind: "palmares",
  title: "Cambriolages, vols, violences : les arrondissements de Paris, Lyon et Marseille comparés",
  description:
    "Délinquance enregistrée en 2025 dans les 45 arrondissements : cambriolages en baisse presque partout, vols et violences là où l'on passe.",
  lead:
    "Les 45 arrondissements des trois plus grandes villes comparés pour les cambriolages, les vols sans violence et les violences physiques, avec leur évolution depuis 2019 et la façon de lire ces chiffres.",
  published: "2026-11-22",
  updated: "2026-11-22",
  author: REDACTION,
  sources: [
    {
      nom: "SSMSI, bases statistiques communales de la délinquance enregistrée, 2016-2025",
      url: "https://www.data.gouv.fr/datasets/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales",
    },
  ],
  related: [
    { href: "/commune/paris/arrondissements", libelle: "Les 20 arrondissements de Paris comparés" },
    { href: "/commune/lyon/arrondissements", libelle: "Les 9 arrondissements de Lyon comparés" },
    { href: "/commune/marseille/arrondissements", libelle: "Les 16 arrondissements de Marseille comparés" },
  ],
};
