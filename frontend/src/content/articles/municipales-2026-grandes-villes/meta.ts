import type { ArticleMeta } from "../types";
import { REDACTION } from "../authors";

export const meta: ArticleMeta = {
  slug: "municipales-2026-grandes-villes",
  kind: "palmares",
  title: "Municipales 2026, un an après : participation et résultats des grandes villes",
  description:
    "Les municipales de mars 2026 dans les 42 villes de plus de 100 000 habitants : participation, listes en tête, seconds tours les plus serrés.",
  lead:
    "Ce qu'ont donné les municipales des 15 et 22 mars 2026 dans les plus grandes villes : la participation, les villes décidées dès le premier tour, les listes arrivées en tête et leur avance.",
  published: "2026-11-22",
  updated: "2026-11-22",
  author: REDACTION,
  sources: [
    {
      nom: "Municipales 2026, résultats du premier tour, ministère de l'Intérieur",
      url: "https://www.data.gouv.fr/datasets/elections-municipales-2026-resultats-du-premier-tour",
    },
    {
      nom: "Municipales 2026, résultats du second tour, ministère de l'Intérieur",
      url: "https://www.data.gouv.fr/datasets/elections-municipales-2026-resultats-du-second-tour",
    },
    { nom: "Population des communes : fichiers de fiscalité locale de la DGFiP, 2025" },
  ],
  related: [
    { href: "/commune/paris", libelle: "Paris : résultats des municipales 2026" },
    { href: "/commune/lyon", libelle: "Lyon : résultats des municipales 2026" },
    { href: "/commune/marseille", libelle: "Marseille : résultats des municipales 2026" },
  ],
};
