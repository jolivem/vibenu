export interface CommuneEquipmentProvider {
  /**
   * Nombre d'équipements BPE par code `typequ`, limité aux codes demandés.
   * `codeCommune = null` compte la France entière (le repère des densités).
   */
  countByTypequ(codeCommune: string | null, typequ: readonly string[]): Promise<Record<string, number>>;
  /**
   * Même comptage sur les communes dont le code suit un motif SQL (`132%` : tout
   * Marseille) — le dénominateur des concentrations anormales d'un arrondissement.
   */
  countByTypequLike(pattern: string, typequ: readonly string[]): Promise<Record<string, number>>;
  /** Population INSEE d'un code commune, ou de `"FRANCE"`. `null` si inconnue. */
  getPopulation(scopeCode: string): Promise<number | null>;
}
