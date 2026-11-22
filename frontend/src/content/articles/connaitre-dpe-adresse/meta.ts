import type { ArticleMeta } from "../types";
import { REDACTION } from "../authors";

export const meta: ArticleMeta = {
  slug: "connaitre-dpe-adresse",
  kind: "guide",
  title: "Connaître le DPE d'une adresse, et ce qu'il change pour louer ou vendre",
  description:
    "Trouver le DPE d'un logement, lire son étiquette, et ce qu'elle change\u00a0: location interdite pour les G depuis 2025, calendrier rediscuté au Parlement.",
  lead:
    "Comment retrouver le diagnostic de performance énergétique d'un logement, ce qu'il impose pour louer ou vendre, et ce que disent les plus de 15 millions de diagnostics enregistrés depuis 2021.",
  published: "2026-11-22",
  updated: "2026-11-22",
  author: REDACTION,
  sources: [
    { nom: "ADEME, DPE des logements existants depuis juillet 2021 (données au 18 novembre 2026)", url: "https://data.ademe.fr/datasets/dpe03existant" },
    { nom: "Diagnostic de performance énergétique, service-public.gouv.fr", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F16096" },
    { nom: "Logement décent et performance énergétique, service-public.gouv.fr", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2042" },
    { nom: "Gel des loyers des passoires énergétiques, ministère de la Transition écologique", url: "https://www.ecologie.gouv.fr/politiques-publiques/location-gel-loyers-passoires-energetiques" },
  ],
  related: [
    { href: "/articles/zone-tendue-liste-des-communes", libelle: "Zone tendue : la liste des communes et ce que ça change" },
    { href: "/articles/risques-naturels-adresse-catastrophe-naturelle", libelle: "Vérifier les risques d'une adresse" },
  ],
};
