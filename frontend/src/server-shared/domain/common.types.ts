export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Niveaux de risque.
 *
 * « présent » et « inconnu » ne sont pas des degrés de gravité mais des états de la
 * donnée, et c'est précisément pour cela qu'ils existent :
 *
 * - « présent » — Géorisques affirme que le risque concerne l'adresse et ne le gradue
 *   pas (`libelleStatut…` = « Risque Existant » ou « Risque Concerne », sans mention).
 *   C'est le cas de l'inondation à Paris. Le ranger en « faible » inventait une gravité
 *   que la source ne donne pas, et c'était le défaut le plus grave de ce module.
 * - « inconnu » — « Risque non Connu », ou aucune donnée du tout (API en échec). Une
 *   absence d'information n'est pas une bonne nouvelle et ne doit pas s'afficher comme
 *   telle.
 *
 * L'ordre de gravité retenu pour le niveau global vit dans `RiskServiceImpl` :
 * élevé > modéré > présent > faible > inconnu > absent. « présent » passe devant
 * « faible » parce qu'un risque non gradué n'est pas un risque connu comme faible.
 */
export type RiskLevel = "inconnu" | "faible" | "présent" | "modéré" | "élevé";
export type RiskCategoryLevel = "absent" | RiskLevel;
export type MobilityLabel = "faible" | "correct" | "bon" | "très bon" | "excellent";
