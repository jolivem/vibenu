/**
 * Lecture des codes commune INSEE, partagée par les domaines dont la source ne suit pas
 * la maille de l'analyse (département pour les repères, ville entière pour ce qui se
 * vote à l'échelle de la ville).
 */

/**
 * Code département à partir du code commune : les DOM tiennent sur 3 caractères
 * (971-976), la métropole sur 2 — la Corse comprise, dont les codes 2A/2B sont déjà
 * les deux premiers caractères de 2A004, 2B033…
 */
export function departementOf(codeInsee: string): string {
  return codeInsee.startsWith("97") ? codeInsee.slice(0, 3) : codeInsee.slice(0, 2);
}

/**
 * Rabat un arrondissement de Paris, Lyon ou Marseille sur sa ville : plusieurs fichiers
 * (municipales du ministère, fiscalité de la DGFiP) ne connaissent que les communes —
 * Paris est `75056`, jamais `75101`. `villeEntiere` remonte jusqu'à l'écran, qui le signale.
 */
export function communeMere(codeInsee: string): { code: string; villeEntiere: boolean } {
  if (/^751\d\d$/.test(codeInsee)) return { code: "75056", villeEntiere: true };
  if (/^6938\d$/.test(codeInsee)) return { code: "69123", villeEntiere: true };
  if (/^132\d\d$/.test(codeInsee)) return { code: "13055", villeEntiere: true };
  return { code: codeInsee, villeEntiere: false };
}
