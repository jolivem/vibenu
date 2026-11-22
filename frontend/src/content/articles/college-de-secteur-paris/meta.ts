import type { ArticleMeta } from "../types";
import { REDACTION } from "../authors";

export const meta: ArticleMeta = {
  slug: "college-de-secteur-paris",
  kind: "guide",
  title: "Collège de secteur à Paris : le trouver, et lire ses résultats",
  description:
    "Comment trouver le collège de secteur d'une adresse à Paris, et lire son IPS et ses résultats au brevet 2025 sans se tromper.",
  lead:
    "Où trouver le collège de secteur d'une adresse parisienne, qui fréquente les collèges de chaque arrondissement, et pourquoi la valeur ajoutée dit plus que le taux de réussite au brevet.",
  published: "2026-11-22",
  updated: "2026-11-22",
  author: REDACTION,
  sources: [
    { nom: "Secteurs scolaires des collèges, Ville de Paris (opendata.paris.fr)", url: "https://opendata.paris.fr/explore/dataset/secteurs-scolaires-colleges/" },
    { nom: "Indices de position sociale des collèges, ministère de l'Éducation nationale", url: "https://data.education.gouv.fr/" },
    { nom: "Indicateurs de valeur ajoutée des collèges, session 2025, DEPP", url: "https://data.education.gouv.fr/" },
  ],
  related: [
    { href: "/commune/paris/arrondissements", libelle: "Les 20 arrondissements de Paris comparés" },
    { href: "/commune/paris", libelle: "Paris : climat, risques et élections" },
  ],
};
