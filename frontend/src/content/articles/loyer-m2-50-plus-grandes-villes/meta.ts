import type { ArticleMeta } from "../types";
import { REDACTION } from "../authors";

export const meta: ArticleMeta = {
  slug: "loyer-m2-50-plus-grandes-villes",
  kind: "palmares",
  title: "Loyer au m² des 50 plus grandes villes de France",
  description:
    "De 32,1 €/m² à Paris à 9,9 €/m² à Saint-Étienne : le loyer d'annonce des appartements dans les 50 plus grandes villes, classées.",
  lead:
    "Les loyers d'annonce des appartements dans les 50 villes les plus peuplées : où ils sont les plus élevés, où ils sont les plus bas, et ce que coûtent les petits logements.",
  published: "2026-11-22",
  updated: "2026-11-22",
  author: REDACTION,
  sources: [
    {
      nom: "ANIL, carte des loyers : loyers d'annonce par commune",
      url: "https://www.data.gouv.fr/datasets/693aa2feed1bf4da603faa49/",
    },
    { nom: "Population des communes : fichiers de fiscalité locale de la DGFiP, 2025" },
  ],
  related: [
    { href: "/articles/zone-tendue-liste-des-communes", libelle: "Zone tendue : la liste des communes et ce que ça change" },
    { href: "/commune/paris/arrondissements", libelle: "Paris : loyers par arrondissement" },
    { href: "/commune/lyon/arrondissements", libelle: "Lyon : loyers par arrondissement" },
    { href: "/commune/marseille/arrondissements", libelle: "Marseille : loyers par arrondissement" },
  ],
};
