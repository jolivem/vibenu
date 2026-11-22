import type { ArticleMeta } from "../types";
import { REDACTION } from "../authors";

export const meta: ArticleMeta = {
  slug: "risques-naturels-adresse-catastrophe-naturelle",
  kind: "guide",
  title: "Inondation, argiles, catastrophes naturelles : vérifier les risques d'une adresse",
  description:
    "Comment vérifier les risques d'un logement avant d'acheter ou de louer. 99 % des communes déjà reconnues en catastrophe naturelle depuis 1982.",
  lead:
    "Les trois étapes pour connaître les risques d'une adresse, ce que doit contenir l'état des risques, et ce que disent 247 140 reconnaissances de catastrophe naturelle depuis 1982.",
  published: "2026-11-22",
  updated: "2026-11-22",
  author: REDACTION,
  sources: [
    { nom: "Géorisques, base GASPAR des arrêtés de catastrophe naturelle (fichier du 2 novembre 2026)", url: "https://www.georisques.gouv.fr/" },
    { nom: "État des risques, service-public.gouv.fr", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F12239" },
    { nom: "Catastrophe naturelle et assurance, service-public.gouv.fr", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F3076" },
    { nom: "ERRIAL, état des risques en ligne, Géorisques", url: "https://errial.georisques.gouv.fr/" },
  ],
  related: [
    { href: "/commune/paris", libelle: "Paris : risques naturels de la ville" },
    { href: "/commune/marseille", libelle: "Marseille : risques naturels de la ville" },
    { href: "/commune/lyon", libelle: "Lyon : risques naturels de la ville" },
  ],
};
