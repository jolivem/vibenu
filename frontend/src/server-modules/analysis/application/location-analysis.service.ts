import type { LocationAnalysisDto } from "../../../server-shared/types/location-analysis.dto";

export type AnalyzeLocationType =
  | "housenumber"
  | "street"
  | "locality"
  | "municipality";

export interface AnalyzeLocationInput {
  lat: number;
  lon: number;
  label?: string;
  city?: string;
  postcode?: string;
  type?: AnalyzeLocationType;
  citycode?: string;
}

export interface LocationAnalysisService {
  analyze(input: AnalyzeLocationInput): Promise<LocationAnalysisDto>;
}
