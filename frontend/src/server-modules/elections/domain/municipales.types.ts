/**
 * Élections municipales des 15 et 22 mars 2026.
 *
 * Deux régimes d'affichage, imposés par la source : l'État ne publie de **nuance
 * politique** que pour 3 282 communes sur 34 836 — celles d'une certaine taille, qui
 * pèsent tout de même 65 % du corps électoral. Ailleurs on connaît le libellé de la
 * liste, ses voix et ses sièges, jamais sa couleur. `nuancee` porte cette distinction.
 */

export interface MunicipalesListe {
  panneau: number;
  /** `null` dans 91 % des communes : pas de nuance publiée. */
  nuance: string | null;
  libelle: string;
  /** `null` dans les petites communes : pas de tête de liste publiée. */
  teteDeListe: string | null;
  voix: number;
  pctExprimes: number;
  /** Score national de la nuance, pour situer. `null` sans nuance. */
  pctNational: number | null;
  siegesCm: number | null;
}

export interface MunicipalesAnalysis {
  /** Tour décisif : le 2 si la commune y est allée, le 1 sinon. */
  tour: 1 | 2;
  inscrits: number;
  participationPct: number;
  /** Vrai si au moins une liste porte une nuance — pilote le mode d'affichage. */
  nuancee: boolean;
  /**
   * Vrai quand le résultat est celui de la ville entière alors que l'adresse est dans un
   * arrondissement (Paris, Lyon, Marseille) : le fichier communal ne descend pas plus bas.
   */
  villeEntiere: boolean;
  nomCommune?: string;
  listes: MunicipalesListe[];
}
