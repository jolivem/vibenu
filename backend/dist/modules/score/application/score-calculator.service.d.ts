import type { ScoreService } from "./score.service.js";
import type { ScoreInput } from "../domain/score.types.js";
import type { ScoreBreakdownDto } from "../../../shared/types/location-analysis.dto.js";
export declare class ScoreCalculatorService implements ScoreService {
    compute(input: ScoreInput): ScoreBreakdownDto;
}
