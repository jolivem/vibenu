import type { LocationAnalysisDto } from "../../../server-shared/types/location-analysis.dto";

export interface AnalyzeLocationInput {
  lat: number;
  lon: number;
  label?: string;
  city?: string;
  postcode?: string;
}

export interface LocationAnalysisService {
  analyze(input: AnalyzeLocationInput): Promise<LocationAnalysisDto>;
}
