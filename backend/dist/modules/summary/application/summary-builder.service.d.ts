import type { SummaryService } from "./summary.service.js";
import type { SummaryInput } from "../domain/summary.types.js";
import type { SummaryDto } from "../../../shared/types/location-analysis.dto.js";
export declare class SummaryBuilderService implements SummaryService {
    build(input: SummaryInput): SummaryDto;
}
