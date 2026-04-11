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

export class LocationAnalysisUseCase implements LocationAnalysisService {
  constructor(private readonly dependencies: Dependencies) {}

  async analyze(input: AnalyzeLocationInput): Promise<LocationAnalysisDto> {
    return this.execute(input);
  }

  async execute(input: AnalyzeLocationInput): Promise<LocationAnalysisDto> {
    // Resolve address first — we need codeInsee for DVF and Atmo
    const addressDetails = await this.dependencies.addressProvider.reverseGeocode(input.lat, input.lon);
    const codeInsee = addressDetails?.citycode;

    const [mobility, risks, realEstate, airQuality, neighborhood] = await Promise.all([
      this.dependencies.mobilityService.getMobilityData(input.lat, input.lon),
      this.dependencies.riskService.getRiskData(input.lat, input.lon),
      this.dependencies.realEstateService.getMarketData(input.lat, input.lon, codeInsee),
      this.dependencies.airQualityService.getAirQualityData(input.lat, input.lon, codeInsee),
      this.dependencies.neighborhoodService.getNeighborhoodData(input.lat, input.lon),
    ]);

    const address = {
      label: input.label ?? addressDetails?.label ?? `${input.lat}, ${input.lon}`,
      city: input.city ?? addressDetails?.city ?? "Inconnue",
      postcode: input.postcode ?? addressDetails?.postcode ?? "",
      latitude: input.lat,
      longitude: input.lon,
    };

    const scores = this.dependencies.scoreService.compute({
      mobilityScore: mobility.score,
      riskScore: risks.score,
      realEstateScore: realEstate.score,
      environmentScore: airQuality.score,
      neighborhoodScore: neighborhood.score,
    });

    const summary = this.dependencies.summaryService.build({
      mobilityScore: mobility.score,
      riskScore: risks.score,
      realEstateScore: realEstate.score,
      addressLabel: address.label,
    });

    return {
      address,
      map: {
        center: { lat: input.lat, lon: input.lon },
        zoom: 14,
      },
      scores,
      mobility,
      risks,
      realEstate,
      airQuality,
      neighborhood,
      summary,
    };
  }
}
