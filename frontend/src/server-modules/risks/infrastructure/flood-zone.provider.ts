import type { FloodWindow, FloodZone } from "../domain/risk.types";

/**
 * Les emprises de PPR inondation d'une fenêtre géographique.
 *
 * Le provider reçoit une fenêtre déjà calculée et ne sait rien du mode d'analyse : c'est
 * la use-case qui choisit entre une boîte autour d'une adresse et l'emprise d'une commune.
 *
 * Ne doit jamais jeter : une source indisponible rend `[]`, et la carte s'affiche sans la
 * couche — comme tous les providers de l'analyse.
 */
export interface FloodZoneProvider {
  getFloodZones(window: FloodWindow): Promise<FloodZone[]>;
}
