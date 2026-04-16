import type { AddressProvider } from "../../address/infrastructure/address.provider";
import type { MobilityService } from "../../mobility/application/mobility.service";
import type { RiskService } from "../../risks/application/risk.service";
import type { RealEstateService } from "../../real-estate/application/real-estate.service";
import type { AirQualityService } from "../../air-quality/application/air-quality.service";
import type { NeighborhoodService } from "../../neighborhood/application/neighborhood.service";
import type { SummaryService } from "../../summary/application/summary.service";
import type { CadastreService } from "../../cadastre/application/cadastre.service";
import type { DemographicsService } from "../../demographics/application/demographics.service";
import type { AnalyzeLocationInput, LocationAnalysisService } from "./location-analysis.service";
import type { LocationAnalysisDto } from "../../../server-shared/types/location-analysis.dto";

interface Dependencies {
  addressProvider: AddressProvider;
  mobilityService: MobilityService;
  riskService: RiskService;
  realEstateService: RealEstateService;
  airQualityService: AirQualityService;
  neighborhoodService: NeighborhoodService;
  summaryService: SummaryService;
  cadastreService: CadastreService;
  demographicsService: DemographicsService;
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

    const [mobility, risks, realEstate, airQuality, neighborhood, cadastre, demographics] = await Promise.all([
      this.dependencies.mobilityService.getMobilityData(input.lat, input.lon),
      this.dependencies.riskService.getRiskData(input.lat, input.lon),
      this.dependencies.realEstateService.getMarketData(input.lat, input.lon, codeInsee),
      this.dependencies.airQualityService.getAirQualityData(input.lat, input.lon, codeInsee),
      this.dependencies.neighborhoodService.getNeighborhoodData(input.lat, input.lon),
      this.dependencies.cadastreService.getCadastreData(input.lat, input.lon),
      this.dependencies.demographicsService.getDemographicsData(input.lat, input.lon),
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
      demographics,
      cadastre,
      summary,
    };
  }
}
