/**
 * Contrat d'API de l'écran d'analyse, vu du client.
 *
 * Ce fichier a longtemps été un duplicata maintenu à la main de
 * `server-shared/types/location-analysis.dto.ts` : les deux avaient déjà divergé sur
 * quelques unions inlinées et commentaires, et tout nouveau champ devait être ajouté
 * deux fois — une dette qui se paie à chaque card ajoutée.
 *
 * Le DTO serveur est désormais la source unique. Le ré-export reste utile : les
 * composants continuent d'importer `@/types/location-analysis`, et la frontière
 * client/serveur reste nommée. Aucun code n'en sort à la compilation (le fichier
 * cible ne contient que des types), donc rien ne fuit dans le bundle.
 */
export * from "@/server-shared/types/location-analysis.dto";
