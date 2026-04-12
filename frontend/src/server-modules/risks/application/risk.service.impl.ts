import type { RiskService } from "./risk.service";
import type { RiskAnalysis } from "../domain/risk.types";
import type { RiskProvider } from "../infrastructure/risk.provider";

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

    const penalty = categories.reduce((sum, c) => sum + severityWeights[c.level], 0);
    const score = Math.max(20, 100 - penalty);

    // Global level = highest individual category level
    const highestLevel = categories[0]?.level ?? "absent";
    const levelMap: Record<string, RiskAnalysis["level"]> = {
      élevé: "élevé",
      modéré: "modéré",
      faible: "faible",
      absent: "faible",
    };
    const level = levelMap[highestLevel];

    return {
      categories,
      level,
      score,
    };
  }
}
