import type { ArticleMeta } from "../types";
import { REDACTION } from "../authors";

export const meta: ArticleMeta = {
  slug: "taxe-fonciere-50-plus-grandes-villes",
  kind: "palmares",
  title: "Taxe foncière\u00a0: les taux des 50 plus grandes villes de France",
  description:
    "De 15,80\u00a0% à Boulogne-Billancourt à 68,00\u00a0% à Grenoble\u00a0: les taux de taxe foncière votés en 2025 dans les 50 plus grandes villes, et leur hausse depuis 2021.",
  lead:
    "Les taux de taxe foncière sur le bâti votés dans les 50 villes les plus peuplées, leur évolution depuis 2021, et pourquoi un taux ne dit pas le montant de l'impôt.",
  published: "2026-11-22",
  updated: "2026-11-22",
  author: REDACTION,
  sources: [
    { nom: "DGFiP, fichiers de fiscalité directe locale (taux votés), 2021-2025", url: "https://data.economie.gouv.fr/" },
    { nom: "Taxe foncière, service-public.gouv.fr", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F59" },
  ],
  related: [
    { href: "/commune/paris/arrondissements", libelle: "Paris : fiscalité et prix par arrondissement" },
    { href: "/articles/loyer-m2-50-plus-grandes-villes", libelle: "Loyer au m² des 50 plus grandes villes" },
  ],
};
