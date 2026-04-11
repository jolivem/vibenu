import type { SummaryDto } from "../../../shared/types/location-analysis.dto.js";
import type { SummaryInput } from "../domain/summary.types.js";

export interface SummaryService {
  build(input: SummaryInput): SummaryDto;
}
