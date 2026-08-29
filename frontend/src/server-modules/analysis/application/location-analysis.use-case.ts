import type { AddressProvider } from "../../address/infrastructure/address.provider";
import type { CommuneContourProvider } from "../../address/infrastructure/commune-contour.provider";
import type { MobilityService } from "../../mobility/application/mobility.service";
import type { RiskService } from "../../risks/application/risk.service";
import type { RealEstateService } from "../../real-estate/application/real-estate.service";
import type { AirQualityService } from "../../air-quality/application/air-quality.service";
import type { NeighborhoodService } from "../../neighborhood/application/neighborhood.service";
import type { SummaryService } from "../../summary/application/summary.service";
import type { CadastreService } from "../../cadastre/application/cadastre.service";
import type { DemographicsService } from "../../demographics/application/demographics.service";
import type { ElectionsService } from "../../elections/application/elections.service";
import type { ClimateService } from "../../climate/application/climate.service";
import type { SchoolSectorService } from "../../school-sector/application/school-sector.service";
import type { SecurityService } from "../../security/application/security.service";
import type { AnalyzeLocationInput, LocationAnalysisService } from "./location-analysis.service";
import type { AnalysisMode, LocationAnalysisDto } from "../../../server-shared/types/location-analysis.dto";

interface Dependencies {
  addressProvider: AddressProvider;
  communeContourProvider: CommuneContourProvider;
  mobilityService: MobilityService;
  riskService: RiskService;
  realEstateService: RealEstateService;
  airQualityService: AirQualityService;
  neighborhoodService: NeighborhoodService;
  summaryService: SummaryService;
  cadastreService: CadastreService;
  demographicsService: DemographicsService;
  electionsService: ElectionsService;
  climateService: ClimateService;
  schoolSectorService: SchoolSectorService;
  securityService: SecurityService;
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
    const contourCitycode = input.citycode ?? codeInsee;

    const mode: AnalysisMode = input.type === "municipality" ? "commune" : "address";

    // Le contour commune est affiché UNIQUEMENT en mode commune.
    // En mode adresse, on ne montre que la parcelle cadastrale — pas l'arrondissement
    // ni la commune (qui surchargeraient la carte sans valeur informative).
    const contourPromise =
      mode === "commune" && contourCitycode
        ? this.dependencies.communeContourProvider.getContour(contourCitycode)
        : Promise.resolve(null);

    // En mode commune, on n'affiche pas la parcelle au centroïde
    // (elle ne représente rien pour l'utilisateur qui regarde le territoire entier).
    const cadastrePromise =
      mode === "commune"
        ? Promise.resolve({ parcel: null, urbanZone: null, prescriptions: [] })
        : this.dependencies.cadastreService.getCadastreData(input.lat, input.lon);

    // Idem pour le voisinage (POIs autour d'un point) : pas pertinent pour une commune entière.
    const neighborhoodPromise =
      mode === "commune"
        ? Promise.resolve({ pois: [], label: "" })
        : this.dependencies.neighborhoodService.getNeighborhoodData(input.lat, input.lon);

    // Carte scolaire : uniquement en mode adresse (le point au centroïde d'une commune
    // ne correspond pas à une vraie résidence et tomberait sur un secteur arbitraire).
    const schoolSectorPromise =
      mode === "commune"
        ? Promise.resolve(null)
        : this.dependencies.schoolSectorService.getCollegeSector(input.lat, input.lon);

    const [mobility, risks, realEstate, airQuality, neighborhood, cadastre, demographics, communeContour, elections, climate, schoolSector, security] =
      await Promise.all([
        this.dependencies.mobilityService.getMobilityData(input.lat, input.lon),
        this.dependencies.riskService.getRiskData(input.lat, input.lon),
        this.dependencies.realEstateService.getMarketData(input.lat, input.lon, codeInsee, { mode }),
        this.dependencies.airQualityService.getAirQualityData(input.lat, input.lon, codeInsee),
        neighborhoodPromise,
        cadastrePromise,
        this.dependencies.demographicsService.getDemographicsData(input.lat, input.lon),
        contourPromise,
        this.dependencies.electionsService.getElectionsData(codeInsee),
        this.dependencies.climateService.getClimateData(input.lat, input.lon),
        schoolSectorPromise,
        this.dependencies.securityService.getSecurityData(codeInsee),
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
      mode,
      address,
      map: {
        center: { lat: input.lat, lon: input.lon },
        zoom: 14,
        ...(communeContour ? { communeContour } : {}),
      },
      mobility,
      risks,
      realEstate,
      airQuality,
      neighborhood,
      demographics,
      cadastre,
      summary,
      elections,
      climate,
      schoolSector,
      security,
    };
  }
}
