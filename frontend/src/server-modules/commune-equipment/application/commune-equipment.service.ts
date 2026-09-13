import type { CommuneEquipment } from "../domain/commune-equipment.types";

export interface CommuneEquipmentService {
  /**
   * Équipements de la commune, avec densités et repère France. `null` si la commune est
   * inconnue de la BPE ou de l'INSEE, ou si une source est indisponible — ne lève jamais.
   */
  getCommuneEquipment(codeCommune: string): Promise<CommuneEquipment | null>;
}
