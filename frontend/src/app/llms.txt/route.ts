import { ALL_COMMUNE_SLUGS } from "@/lib/commune-slugs";
import { BRANDING, FEATURES } from "@/lib/site-features";

/**
 * `/llms.txt` : une présentation du site pour les assistants conversationnels, au format
 * proposé sur llmstxt.org (titre, résumé, sections de liens, en Markdown).
 *
 * Ce n'est pas un standard reconnu par les grands moteurs ; le fichier coûte peu et dit à un
 * assistant ce qu'il ne peut pas deviner : comment construire le lien d'une analyse
 * (`/analyze` est interdit aux robots et rendu côté client, rien à y lire), d'où viennent
 * les chiffres, et quelles pages se citent.
 *
 * Dynamique, comme `robots.ts` et `sitemap.ts` : `SITE_URL` est lue au démarrage du serveur.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
  const communes = FEATURES.hasSEOPages
    ? ALL_COMMUNE_SLUGS.map((c) => `- [${c.nomAffiche}](${siteUrl}/commune/${c.slug})`).join("\n")
    : "";

  const body = `# ${BRANDING.name}

> Site gratuit, sans inscription : on saisit une adresse ou une commune française et l'on obtient, sur une carte et en langage courant, ce que les données publiques officielles en disent, avant d'acheter ou de louer. Free French site: enter a French address to see what official open data says about it.

Chaque chiffre vient d'une source publique citée sur la page. Aucun score global : chaque indicateur est donné dans son unité et comparé à un repère (la commune, la France). Seules les phrases « En bref » sont rédigées par un modèle de langage, à partir des mêmes chiffres.

## Ce qu'affiche l'analyse d'une adresse

- Immobilier : ventes réelles des dix dernières années à moins d'un kilomètre (base DVF) et prix médian au m² ; loyers d'annonce de la commune (ANIL) et zone tendue ; DPE des logements de l'adresse, un par logement, avec date, surface, classe et consommation (ADEME) ; parcelle cadastrale et zone du PLU (IGN, Géoportail de l'Urbanisme).
- Enseignement : collèges et lycées alentour, réussite aux examens, valeur ajoutée, indice de position sociale (ministère de l'Éducation nationale).
- Proximité et transports : commerces, services, arrêts et gares, avec le temps à pied (INSEE BPE, OpenStreetMap, transport.data.gouv.fr).
- Sécurité : faits de délinquance enregistrés, à l'échelle de la commune, comparés aux communes de même taille (SSMSI).
- Population : âges, revenus, diplômes, ménages, logements, au niveau du quartier IRIS (INSEE).
- Élections : municipales 2026, présidentielle 2022 (ministère de l'Intérieur).
- Fiscalité locale : taxe foncière, ordures ménagères, droits de mutation, comptes de la commune (DGFiP).
- Environnement et risques : climat (Météo-France), qualité de l'air, inondation, argiles, séisme, radon, sites industriels (Géorisques).
- Histoire : cartes et photographies aériennes anciennes (IGN).

## Lien direct vers l'analyse d'une adresse

Le lien se construit à partir des coordonnées de l'adresse, que donne le service de géocodage de la Base Adresse Nationale (https://data.geopf.fr/geocodage/search?q=...) :

${siteUrl}/analyze?lat={latitude}&lon={longitude}&label={adresse}&type=housenumber&citycode={code INSEE}

Exemple : ${siteUrl}/analyze?lat=48.845251&lon=2.285471&label=11+Rue+de+l%27%C3%89glise+75015+Paris&type=housenumber&citycode=75115

Pour une commune entière : type=municipality et le code INSEE de la commune dans citycode.

## Pages

- [Accueil et questions fréquentes](${siteUrl}/)
- [À propos : méthode et liste des sources](${siteUrl}/a-propos)
${communes ? `\n## Pages des communes (Paris, Lyon, Marseille et leurs arrondissements)\n\n${communes}\n` : ""}`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
