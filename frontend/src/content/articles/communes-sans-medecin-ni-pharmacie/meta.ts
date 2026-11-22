import type { ArticleMeta } from "../types";
import { REDACTION } from "../authors";

export const meta: ArticleMeta = {
  slug: "communes-sans-medecin-ni-pharmacie",
  kind: "palmares",
  title: "Les communes de plus de 2 000 habitants sans médecin ni pharmacie",
  description:
    "395 communes de plus de 2 000 habitants n'ont aucun médecin généraliste, 149 ni médecin ni pharmacie. Où elles sont, et comment lire ces chiffres.",
  lead:
    "Les communes moyennes sans médecin généraliste ni pharmacie d'après la base permanente des équipements de l'INSEE : combien, où, et les précautions avant de citer une commune.",
  published: "2026-11-22",
  updated: "2026-11-22",
  author: REDACTION,
  sources: [
    { nom: "INSEE, base permanente des équipements 2025", url: "https://www.insee.fr/fr/statistiques/8217525" },
    { nom: "Population des communes : fichiers de fiscalité locale de la DGFiP, 2025" },
  ],
  related: [{ href: "/articles/zone-tendue-liste-des-communes", libelle: "Zone tendue : la liste des communes et ce que ça change" }],
};
