import type { AnalyzeLocationInput } from "../../modules/analysis/application/location-analysis.service.js";
export declare const makeLocationAnalysisController: () => {
    handle: (input: AnalyzeLocationInput) => Promise<import("../../shared/types/location-analysis.dto.js").LocationAnalysisDto>;
};
