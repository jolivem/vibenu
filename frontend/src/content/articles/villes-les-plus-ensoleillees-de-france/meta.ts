import type { ArticleMeta } from "../types";
import { REDACTION } from "../authors";

export const meta: ArticleMeta = {
  slug: "villes-les-plus-ensoleillees-de-france",
  kind: "palmares",
  title: "Les villes les plus ensoleillées de France : le classement des stations Météo-France",
  description:
    "De 2 898 heures de soleil par an à Marignane à 1 463 à Landivisiau : les 143 stations de métropole classées, et les grandes villes.",
  lead:
    "La durée d'ensoleillement mesurée par Météo-France de 1991 à 2020, station par station : les plus ensoleillées, les moins ensoleillées, la place des grandes villes, et l'outre-mer à part.",
  published: "2026-11-22",
  updated: "2026-11-22",
  author: REDACTION,
  sources: [
    {
      nom: "Météo-France, fiches climatologiques des stations, normales 1991-2020",
      url: "https://donneespubliques.meteofrance.fr/",
    },
  ],
  related: [
    { href: "/commune/paris", libelle: "Paris : climat, air et risques" },
    { href: "/commune/marseille", libelle: "Marseille : climat, air et risques" },
    { href: "/commune/lyon", libelle: "Lyon : climat, air et risques" },
  ],
};
