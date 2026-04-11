import type { AddressProvider } from "../../address/infrastructure/address.provider.js";
import type { MobilityService } from "../../mobility/application/mobility.service.js";
import type { RiskService } from "../../risks/application/risk.service.js";
import type { RealEstateService } from "../../real-estate/application/real-estate.service.js";
import type { AirQualityService } from "../../air-quality/application/air-quality.service.js";
import type { NeighborhoodService } from "../../neighborhood/application/neighborhood.service.js";
import type { ScoreService } from "../../score/application/score.service.js";
import type { SummaryService } from "../../summary/application/summary.service.js";
import type { AnalyzeLocationInput, LocationAnalysisService } from "./location-analysis.service.js";
import type { LocationAnalysisDto } from "../../../shared/types/location-analysis.dto.js";
interface Dependencies {
    addressProvider: AddressProvider;
    mobilityService: MobilityService;
    riskService: RiskService;
    realEstateService: RealEstateService;
    airQualityService: AirQualityService;
    neighborhoodService: NeighborhoodService;
    scoreService: ScoreService;
    summaryService: SummaryService;
}
export declare class LocationAnalysisUseCase implements LocationAnalysisService {
    private readonly dependencies;
    constructor(dependencies: Dependencies);
    analyze(input: AnalyzeLocationInput): Promise<LocationAnalysisDto>;
    execute(input: AnalyzeLocationInput): Promise<LocationAnalysisDto>;
}
export {};
