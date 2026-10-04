import type { LocalTaxTransferDuty } from "../domain/local-tax.types";

/**
 * Taux départementaux des droits d'enregistrement et de la taxe de publicité foncière
 * sur les ventes d'immeubles, ressaisis à la main depuis le barème de la DGFiP : il
 * n'en existe pas de version lisible par une machine.
 *
 * À REVOIR À CHAQUE NOUVEAU BARÈME (la DGFiP en publie plusieurs par an) : mettre à
 * jour la date, l'URL et la table des exceptions.
 *
 * Seule la part départementale est donnée. La taxe communale additionnelle et les frais
 * d'assiette perçus par l'État s'y ajoutent ; ils ne sont pas chiffrés ici.
 */
export const DMTO_VALABLE_AU = "2026-06-01";
export const DMTO_SOURCE_URL =
  "https://www.impots.gouv.fr/sites/default/files/media/1_metier/3_partenaire/notaires/dmto/dmto_2026-06.pdf";

/** Taux relevé par la plupart des départements (loi de finances pour 2025, art. 116). */
const TAUX_COURANT = 5.0;
/** Taux de droit commun (CGI, art. 1594 D), que les primo-accédants conservent partout. */
const TAUX_PRIMO_ACCEDANT = 4.5;

/** Départements qui n'appliquent pas le taux courant. */
const EXCEPTIONS: Record<string, number> = {
  "05": 4.5, // Hautes-Alpes
  "06": 4.5, // Alpes-Maritimes
  "07": 4.5, // Ardèche
  "16": 4.5, // Charente
  "26": 4.5, // Drôme
  "36": 3.8, // Indre
  "48": 4.5, // Lozère
  "60": 4.5, // Oise
  "65": 4.5, // Hautes-Pyrénées
  "71": 4.5, // Saône-et-Loire
  "971": 4.5, // Guadeloupe
  "976": 4.5, // Mayotte
};

/** Les 101 départements du barème ; les collectivités d'outre-mer (975, 977, 98x) n'y sont pas. */
function isInBareme(departement: string): boolean {
  if (/^97[12346]$/.test(departement)) return true;
  if (departement === "2A" || departement === "2B") return true;
  if (!/^\d{2}$/.test(departement)) return false;
  const n = Number(departement);
  return n >= 1 && n <= 95 && n !== 20;
}

export function dmtoOf(departement: string): LocalTaxTransferDuty | null {
  if (!isInBareme(departement)) return null;
  const tauxDepartemental = EXCEPTIONS[departement] ?? TAUX_COURANT;
  return {
    tauxDepartemental,
    tauxPrimoAccedant: tauxDepartemental > TAUX_PRIMO_ACCEDANT ? TAUX_PRIMO_ACCEDANT : null,
    valableAu: DMTO_VALABLE_AU,
    sourceUrl: DMTO_SOURCE_URL,
  };
}
