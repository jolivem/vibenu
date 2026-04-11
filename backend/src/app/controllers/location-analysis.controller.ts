import type { AnalyzeLocationInput } from "../../modules/analysis/application/location-analysis.service.js";
import { LocationAnalysisUseCase } from "../../modules/analysis/application/location-analysis.use-case.js";
import { GeoApiAddressProvider } from "../../modules/address/infrastructure/geo-api-address.provider.js";
import { TransportDataGouvProvider } from "../../modules/mobility/infrastructure/transport-data-gouv.provider.js";
import { GeorisquesRiskProvider } from "../../modules/risks/infrastructure/brgm-risk.provider.js";
import { DvfRealEstateProvider } from "../../modules/real-estate/infrastructure/dvf-real-estate.provider.js";
import { ScoreCalculatorService } from "../../modules/score/application/score-calculator.service.js";
import { SummaryBuilderService } from "../../modules/summary/application/summary-builder.service.js";
import { MobilityServiceImpl } from "../../modules/mobility/application/mobility.service.impl.js";
import { RiskServiceImpl } from "../../modules/risks/application/risk.service.impl.js";
import { RealEstateServiceImpl } from "../../modules/real-estate/application/real-estate.service.impl.js";
import { AtmoAirQualityProvider } from "../../modules/air-quality/infrastructure/atmo-air-quality.provider.js";
import { AirQualityServiceImpl } from "../../modules/air-quality/application/air-quality.service.js";
import { OverpassNeighborhoodProvider } from "../../modules/neighborhood/infrastructure/overpass-neighborhood.provider.js";
import { NeighborhoodServiceImpl } from "../../modules/neighborhood/application/neighborhood.service.impl.js";

export const makeLocationAnalysisController = () => {
  const mobilityService = new MobilityServiceImpl(new TransportDataGouvProvider());
  const riskService = new RiskServiceImpl(new GeorisquesRiskProvider());
  const realEstateService = new RealEstateServiceImpl(new DvfRealEstateProvider());
  const airQualityService = new AirQualityServiceImpl(new AtmoAirQualityProvider());
  const neighborhoodService = new NeighborhoodServiceImpl(new OverpassNeighborhoodProvider());
  const scoreService = new ScoreCalculatorService();
  const summaryService = new SummaryBuilderService();
  const addressProvider = new GeoApiAddressProvider();

  const useCase = new LocationAnalysisUseCase({
    addressProvider,
    mobilityService,
    riskService,
    realEstateService,
    airQualityService,
    neighborhoodService,
    scoreService,
    summaryService,
  });

  return {
    handle: async (input: AnalyzeLocationInput) => useCase.execute(input),
  };
};
