import type { RiskService } from "./risk.service";
import type { FloodWindow, FloodZone, RiskAnalysis } from "../domain/risk.types";
import type { RiskProvider, RiskScope } from "../infrastructure/risk.provider";
import type { FloodZoneProvider } from "../infrastructure/flood-zone.provider";
import type { RiskCategoryLevel } from "../../../server-shared/domain/common.types";

export class RiskServiceImpl implements RiskService {
  /**
   * `floodZoneProvider` est optionnel : les pages commune SEO construisent ce service pour
   * le seul rapport Géorisques, sans carte à alimenter. Sans provider, `getFloodZones`
   * rend une liste vide au lieu d'exiger un branchement inutile.
   */
  constructor(
    private readonly riskProvider: RiskProvider,
    private readonly floodZoneProvider?: FloodZoneProvider,
  ) {}

  async getFloodZones(window: FloodWindow): Promise<FloodZone[]> {
    if (!this.floodZoneProvider) return [];
    return this.floodZoneProvider.getFloodZones(window);
  }

  async getRiskData(lat: number, lon: number, scope?: RiskScope): Promise<RiskAnalysis> {
    const categories = await this.riskProvider.getLocationRisks(lat, lon, scope);

    // « présent » passe devant « faible » : un risque que Géorisques signale sans le
    // graduer n'est pas un risque connu comme faible. « inconnu » passe devant
    // « absent » pour la même raison — ne rien savoir n'est pas savoir qu'il n'y a rien.
    const severityWeights: Record<RiskCategoryLevel, number> = {
      élevé: 50,
      modéré: 30,
      présent: 20,
      faible: 10,
      inconnu: 5,
      absent: 0,
    };

    // Sort categories from highest to lowest risk
    categories.sort((a, b) => severityWeights[b.level] - severityWeights[a.level]);

    // Global level = highest individual category level
    const highestLevel: RiskCategoryLevel = categories[0]?.level ?? "absent";
    const levelMap: Record<RiskCategoryLevel, RiskAnalysis["level"]> = {
      élevé: "élevé",
      modéré: "modéré",
      présent: "présent",
      faible: "faible",
      inconnu: "inconnu",
      // Aucun risque identifié sur le secteur : « faible » reste juste, c'est une
      // information positive et non une absence de donnée.
      absent: "faible",
    };
    const level = levelMap[highestLevel];

    return {
      categories,
      level,
    };
  }
}
