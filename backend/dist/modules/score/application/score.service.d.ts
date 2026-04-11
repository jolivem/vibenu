import type { ScoreInput } from "../domain/score.types.js";
import type { ScoreBreakdownDto } from "../../../shared/types/location-analysis.dto.js";
export interface ScoreService {
    compute(input: ScoreInput): ScoreBreakdownDto;
}
