import type { LocationAnalysisDto } from "../../../shared/types/location-analysis.dto.js";
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
