import type { ScoreService } from "./score.service.js";
import type { ScoreInput } from "../domain/score.types.js";
import type { ScoreBreakdownDto } from "../../../shared/types/location-analysis.dto.js";

export class ScoreCalculatorService implements ScoreService {
  compute(input: ScoreInput): ScoreBreakdownDto {
    const globalScore = Math.round(
      input.mobilityScore * 0.25 +
        input.riskScore * 0.25 +
        input.realEstateScore * 0.2 +
        input.environmentScore * 0.1 +
        input.neighborhoodScore * 0.2,
    );

    return {
      globalScore,
      mobilityScore: input.mobilityScore,
      riskScore: input.riskScore,
      realEstateScore: input.realEstateScore,
      environmentScore: input.environmentScore,
      neighborhoodScore: input.neighborhoodScore,
    };
  }
}
