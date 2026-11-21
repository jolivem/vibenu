import type { ArticleMeta } from "../types";
import { REDACTION } from "../authors";

export const meta: ArticleMeta = {
  slug: "prix-m2-arrondissements-paris-lyon-marseille",
  kind: "palmares",
  title: "Prix au m² par arrondissement à Paris, Lyon et Marseille en 2025",
  description:
    "Ventes réelles 2025 : le m² baisse de 11 % à Paris et de 12 % à Lyon depuis 2021, monte de 11 % à Marseille. Le classement des 45 arrondissements.",
  lead:
    "Les ventes d'appartements enregistrées par les notaires, arrondissement par arrondissement : où le m² est le plus cher, où il a le plus baissé depuis 2021, et le cas de Marseille, qui monte quand Paris et Lyon baissent.",
  published: "2026-11-21",
  updated: "2026-11-21",
  author: REDACTION,
  sources: [
    {
      nom: "Demandes de valeurs foncières (DVF), DGFiP, ventes 2021 et 2025",
      url: "https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres/",
    },
  ],
  related: [
    { href: "/commune/paris/arrondissements", libelle: "Les 20 arrondissements de Paris comparés" },
    { href: "/commune/lyon/arrondissements", libelle: "Les 9 arrondissements de Lyon comparés" },
    { href: "/commune/marseille/arrondissements", libelle: "Les 16 arrondissements de Marseille comparés" },
  ],
};
