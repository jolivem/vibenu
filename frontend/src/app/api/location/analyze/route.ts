import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LocationAnalysisUseCase } from "@/server-modules/analysis/application/location-analysis.use-case";
import { GeoApiAddressProvider } from "@/server-modules/address/infrastructure/geo-api-address.provider";
import { TransportDataGouvProvider } from "@/server-modules/mobility/infrastructure/transport-data-gouv.provider";
import { GeorisquesRiskProvider } from "@/server-modules/risks/infrastructure/brgm-risk.provider";
import { NoOpRealEstateProvider } from "@/server-modules/real-estate/infrastructure/noop-real-estate.provider";
import { SummaryBuilderService } from "@/server-modules/summary/application/summary-builder.service";
import { MobilityServiceImpl } from "@/server-modules/mobility/application/mobility.service.impl";
import { RiskServiceImpl } from "@/server-modules/risks/application/risk.service.impl";
import { RealEstateServiceImpl } from "@/server-modules/real-estate/application/real-estate.service.impl";
import { AtmoAirQualityProvider } from "@/server-modules/air-quality/infrastructure/atmo-air-quality.provider";
import { AirQualityServiceImpl } from "@/server-modules/air-quality/application/air-quality.service";
import { OverpassNeighborhoodProvider } from "@/server-modules/neighborhood/infrastructure/overpass-neighborhood.provider";
import { NeighborhoodServiceImpl } from "@/server-modules/neighborhood/application/neighborhood.service.impl";
import { ApiCartoCadastreProvider } from "@/server-modules/cadastre/infrastructure/apicarto-cadastre.provider";
import { CadastreServiceImpl } from "@/server-modules/cadastre/application/cadastre.service.impl";

const analyzeQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  label: z.string().trim().min(1).optional(),
  city: z.string().trim().optional(),
  postcode: z.string().trim().optional(),
});

const useCase = new LocationAnalysisUseCase({
  addressProvider: new GeoApiAddressProvider(),
  mobilityService: new MobilityServiceImpl(new TransportDataGouvProvider()),
  riskService: new RiskServiceImpl(new GeorisquesRiskProvider()),
  realEstateService: new RealEstateServiceImpl(new NoOpRealEstateProvider()),
  airQualityService: new AirQualityServiceImpl(new AtmoAirQualityProvider()),
  neighborhoodService: new NeighborhoodServiceImpl(new OverpassNeighborhoodProvider()),
  summaryService: new SummaryBuilderService(),
  cadastreService: new CadastreServiceImpl(new ApiCartoCadastreProvider()),
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

  const result = await useCase.execute(parsed.data);
  return NextResponse.json(result);
}
