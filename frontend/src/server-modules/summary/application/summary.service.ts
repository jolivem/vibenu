import type { SummaryDto } from "../../../server-shared/types/location-analysis.dto";
import type { SummaryInput } from "../domain/summary.types";

export interface SummaryService {
  build(input: SummaryInput): SummaryDto;
}
