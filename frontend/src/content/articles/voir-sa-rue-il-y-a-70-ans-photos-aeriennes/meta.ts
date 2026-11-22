import type { ArticleMeta } from "../types";
import { REDACTION } from "../authors";

export const meta: ArticleMeta = {
  slug: "voir-sa-rue-il-y-a-70-ans-photos-aeriennes",
  kind: "guide",
  title: "Voir sa rue il y a 70 ans : photos aériennes et cartes anciennes de l'IGN",
  description:
    "Comment voir les photos aériennes anciennes d'une adresse, de 1950 à aujourd'hui, et les cartes de Cassini et de l'état-major. Gratuit, données IGN.",
  lead:
    "Comment remonter le temps à une adresse avec les photographies aériennes et les cartes anciennes de l'IGN, et ce qu'elles apprennent sur un terrain avant d'acheter.",
  published: "2026-11-22",
  updated: "2026-11-22",
  author: REDACTION,
  sources: [
    { nom: "IGN, Géoplateforme : photographies aériennes historiques et cartes anciennes", url: "https://cartes.gouv.fr/" },
    { nom: "IGN, Remonter le temps", url: "https://remonterletemps.ign.fr/" },
  ],
  related: [
    { href: "/articles/risques-naturels-adresse-catastrophe-naturelle", libelle: "Vérifier les risques d'une adresse" },
  ],
};
