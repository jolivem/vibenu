import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LocationAnalysisUseCase } from "@/server-modules/analysis/application/location-analysis.use-case";
import { GeoApiAddressProvider } from "@/server-modules/address/infrastructure/geo-api-address.provider";
import { CommuneContourProvider } from "@/server-modules/address/infrastructure/commune-contour.provider";
import { TransportDataGouvProvider } from "@/server-modules/mobility/infrastructure/transport-data-gouv.provider";
import { GeorisquesRiskProvider } from "@/server-modules/risks/infrastructure/brgm-risk.provider";
import { DvfDatabaseProvider } from "@/server-modules/real-estate/infrastructure/dvf-database.provider";
import { SummaryBuilderService } from "@/server-modules/summary/application/summary-builder.service";
import { MobilityServiceImpl } from "@/server-modules/mobility/application/mobility.service.impl";
import { RiskServiceImpl } from "@/server-modules/risks/application/risk.service.impl";
import { RealEstateServiceImpl } from "@/server-modules/real-estate/application/real-estate.service.impl";
import { AtmoAirQualityProvider } from "@/server-modules/air-quality/infrastructure/atmo-air-quality.provider";
import { AirQualityServiceImpl } from "@/server-modules/air-quality/application/air-quality.service";
import { CombinedNeighborhoodProvider } from "@/server-modules/neighborhood/infrastructure/combined-neighborhood.provider";
import { NeighborhoodServiceImpl } from "@/server-modules/neighborhood/application/neighborhood.service.impl";
import { ApiCartoCadastreProvider } from "@/server-modules/cadastre/infrastructure/apicarto-cadastre.provider";
import { CadastreServiceImpl } from "@/server-modules/cadastre/application/cadastre.service.impl";
import { IrisDemographicsProvider } from "@/server-modules/demographics/infrastructure/iris-demographics.provider";
import { DemographicsServiceImpl } from "@/server-modules/demographics/application/demographics.service";
import { ElectionsDatabaseProvider } from "@/server-modules/elections/infrastructure/elections-database.provider";
import { ElectionsServiceImpl } from "@/server-modules/elections/application/elections.service.impl";
import { SecurityDatabaseProvider } from "@/server-modules/security/infrastructure/security-database.provider";
import { SecurityServiceImpl } from "@/server-modules/security/application/security.service.impl";
import { MeteoFranceStationsProvider } from "@/server-modules/climate/infrastructure/meteo-france-stations.provider";
import { ClimateServiceImpl } from "@/server-modules/climate/application/climate.service.impl";
import { PostgisSchoolSectorProvider } from "@/server-modules/school-sector/infrastructure/postgis-school-sector.provider";
import { SchoolSectorServiceImpl } from "@/server-modules/school-sector/application/school-sector.service.impl";

const analyzeQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  label: z.string().trim().min(1).optional(),
  city: z.string().trim().optional(),
  postcode: z.string().trim().optional(),
  type: z.enum(["housenumber", "street", "locality", "municipality"]).optional(),
  citycode: z.string().trim().regex(/^[0-9AB]{5}$/i).optional(), // 5 chiffres ou Corse (2A/2B)
});

const useCase = new LocationAnalysisUseCase({
  addressProvider: new GeoApiAddressProvider(),
  communeContourProvider: new CommuneContourProvider(),
  mobilityService: new MobilityServiceImpl(new TransportDataGouvProvider()),
  riskService: new RiskServiceImpl(new GeorisquesRiskProvider()),
  realEstateService: new RealEstateServiceImpl(new DvfDatabaseProvider()),
  airQualityService: new AirQualityServiceImpl(new AtmoAirQualityProvider()),
  neighborhoodService: new NeighborhoodServiceImpl(new CombinedNeighborhoodProvider()),
  summaryService: new SummaryBuilderService(),
  cadastreService: new CadastreServiceImpl(new ApiCartoCadastreProvider()),
  demographicsService: new DemographicsServiceImpl(new IrisDemographicsProvider()),
  electionsService: new ElectionsServiceImpl(new ElectionsDatabaseProvider()),
  securityService: new SecurityServiceImpl(new SecurityDatabaseProvider()),
  climateService: new ClimateServiceImpl(new MeteoFranceStationsProvider()),
  schoolSectorService: new SchoolSectorServiceImpl(new PostgisSchoolSectorProvider()),
});

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = analyzeQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Paramètres d'analyse invalides." },
      { status: 400 },
    );
  }

  try {
    const result = await useCase.execute(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/location/analyze] failed:", error);
    return NextResponse.json(
      {
        message: "Erreur lors de l'analyse de la localisation.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
