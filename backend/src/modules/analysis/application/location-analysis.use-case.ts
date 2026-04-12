import type { AddressProvider } from "../../address/infrastructure/address.provider.js";
import type { MobilityService } from "../../mobility/application/mobility.service.js";
import type { RiskService } from "../../risks/application/risk.service.js";
import type { RealEstateService } from "../../real-estate/application/real-estate.service.js";
import type { AirQualityService } from "../../air-quality/application/air-quality.service.js";
import type { NeighborhoodService } from "../../neighborhood/application/neighborhood.service.js";
import type { SummaryService } from "../../summary/application/summary.service.js";
import type { CadastreService } from "../../cadastre/application/cadastre.service.js";
import type { AnalyzeLocationInput, LocationAnalysisService } from "./location-analysis.service.js";
import type { LocationAnalysisDto } from "../../../shared/types/location-analysis.dto.js";

interface Dependencies {
  addressProvider: AddressProvider;
  mobilityService: MobilityService;
  riskService: RiskService;
  realEstateService: RealEstateService;
  airQualityService: AirQualityService;
  neighborhoodService: NeighborhoodService;
  summaryService: SummaryService;
  cadastreService: CadastreService;
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

    const [mobility, risks, realEstate, airQuality, neighborhood, cadastre] = await Promise.all([
      this.dependencies.mobilityService.getMobilityData(input.lat, input.lon),
      this.dependencies.riskService.getRiskData(input.lat, input.lon),
      this.dependencies.realEstateService.getMarketData(input.lat, input.lon, codeInsee),
      this.dependencies.airQualityService.getAirQualityData(input.lat, input.lon, codeInsee),
      this.dependencies.neighborhoodService.getNeighborhoodData(input.lat, input.lon),
      this.dependencies.cadastreService.getCadastreData(input.lat, input.lon),
    ]);

    const address = {
      label: input.label ?? addressDetails?.label ?? `${input.lat}, ${input.lon}`,
      city: input.city ?? addressDetails?.city ?? "Inconnue",
      postcode: input.postcode ?? addressDetails?.postcode ?? "",
      latitude: input.lat,
      longitude: input.lon,
    };

    const summary = this.dependencies.summaryService.build({
      mobilityLabel: mobility.label,
      riskLevel: risks.level,
      realEstateConfidence: realEstate.confidence,
      addressLabel: address.label,
    });

    return {
      address,
      map: {
        center: { lat: input.lat, lon: input.lon },
        zoom: 14,
      },
      mobility,
      risks,
      realEstate,
      airQuality,
      neighborhood,
      cadastre,
      summary,
    };
  }
}
