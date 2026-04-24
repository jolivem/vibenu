import type { LocationAnalysisDto } from "@/server-shared/types/location-analysis.dto";
import type { NarrativeProvider } from "../infrastructure/narrative.provider";
import type { NarrativeCacheRepository } from "../infrastructure/narrative-cache.repository";
import type { NarrativeDto, NarrativeInput } from "../domain/narrative.types";

export class NarrativeService {
  constructor(
    private readonly provider: NarrativeProvider,
    private readonly cache: NarrativeCacheRepository,
  ) {}

  async generate(data: LocationAnalysisDto): Promise<NarrativeDto> {
    const { lat, lon } = data.map.center;

    const cached = await this.cache.get(lat, lon);
    if (cached) {
      return {
        paragraph: cached.paragraph,
        generatedAt: cached.generatedAt.toISOString(),
        cached: true,
      };
    }

    const input = buildNarrativeInput(data);
    const paragraph = await this.provider.generate(input);

    await this.cache.set(lat, lon, paragraph);

    return {
      paragraph,
      generatedAt: new Date().toISOString(),
      cached: false,
    };
  }
}

function buildNarrativeInput(data: LocationAnalysisDto): NarrativeInput {
  const highlighted = data.risks.categories
    .filter((r) => r.level === "élevé" || r.level === "modéré")
    .map((r) => ({ name: r.name, level: r.level }));

  const categoriesPresent = Array.from(
    new Set(data.neighborhood.pois.map((p) => p.category)),
  );

  return {
    addressLabel: data.address.label,
    mobility: {
      score: data.mobility.score,
      label: data.mobility.label,
      hasNearbyStation: data.mobility.nearestStation != null,
      nearestStationDistanceMeters: data.mobility.nearestStation?.distanceMeters ?? null,
      busStopsCount: data.mobility.nearestStops.length,
    },
    risks: {
      level: data.risks.level,
      highlighted,
    },
    airQuality: {
      level: data.airQuality.level,
    },
    realEstate: data.realEstate
      ? {
          score: data.realEstate.score,
          priceLevel: data.realEstate.priceLevel ?? null,
          medianPricePerSquareMeter: data.realEstate.medianPricePerSquareMeter ?? null,
          nearbyTransactionsCount: data.realEstate.nearbyTransactionsCount ?? null,
        }
      : null,
    neighborhood: {
      score: data.neighborhood.score,
      label: data.neighborhood.label,
      categoriesPresent,
    },
    demographics: data.demographics
      ? {
          nomCommune: data.demographics.nomCommune,
          population: data.demographics.population,
          revenuMedian: data.demographics.revenuMedian,
          tauxPauvrete: data.demographics.tauxPauvrete,
        }
      : null,
    cadastre: data.cadastre
      ? {
          urbanZoneType: data.cadastre.urbanZone?.type ?? null,
          urbanZoneLabel: data.cadastre.urbanZone?.label ?? null,
          parcelSurface: data.cadastre.parcel?.contenance ?? null,
        }
      : null,
  };
}
