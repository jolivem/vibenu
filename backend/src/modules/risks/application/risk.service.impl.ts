import type { RiskService } from "./risk.service.js";
import type { RiskAnalysis } from "../domain/risk.types.js";
import type { RiskProvider } from "../infrastructure/risk.provider.js";

export class RiskServiceImpl implements RiskService {
  constructor(private readonly riskProvider: RiskProvider) {}

  async getRiskData(lat: number, lon: number): Promise<RiskAnalysis> {
    const categories = await this.riskProvider.getLocationRisks(lat, lon);

    const severityWeights = {
      élevé: 45,
      modéré: 25,
      faible: 10,
      absent: 0,
    } as const;

    // Sort categories from highest to lowest risk
    categories.sort((a, b) => severityWeights[b.level] - severityWeights[a.level]);

    const penalty = categories.reduce((sum, category) => sum + severityWeights[category.level], 0);
    const score = Math.max(20, 100 - penalty);

    let level: RiskAnalysis["level"] = "faible";
    if (score < 45) level = "élevé";
    else if (score < 70) level = "modéré";

    return {
      categories,
      level,
      score,
    };
  }
}
