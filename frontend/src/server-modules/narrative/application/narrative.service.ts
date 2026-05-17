import type { LocationAnalysisDto } from "@/server-shared/types/location-analysis.dto";
import type { NarrativeProvider } from "../infrastructure/narrative.provider";
import type { NarrativeCacheRepository } from "../infrastructure/narrative-cache.repository";
import type { NarrativeDto, NarrativeInput } from "../domain/narrative.types";

export class NarrativeService {
  constructor(
    private readonly provider: NarrativeProvider,
    private readonly cache: NarrativeCacheRepository,
  ) {}

  async generate(
    data: LocationAnalysisDto,
    options: { debug?: boolean } = {},
  ): Promise<NarrativeDto> {
    const { lat, lon } = data.map.center;
    const input = buildNarrativeInput(data);

    if (!options.debug) {
      const cached = await this.cache.get(lat, lon, input.mode);
      if (cached) {
        return {
          paragraph: cached.paragraph,
          generatedAt: cached.generatedAt.toISOString(),
          cached: true,
        };
      }
    }

    const paragraph = await this.provider.generate(input);

    if (!options.debug) {
      await this.cache.set(lat, lon, paragraph, input.mode);
    }

    return {
      paragraph,
      generatedAt: new Date().toISOString(),
      cached: false,
      ...(options.debug ? { debugInput: input } : {}),
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

  const isCommune = data.mode === "commune";
  const nearestStationDistance = data.mobility.nearestStations[0]?.distanceMeters ?? null;

  // En mode commune, on ne peut PAS prétendre "la commune dispose d'une gare" en se
  // basant sur la simple présence d'une station dans le wide search (20 km), qui
  // remonte aussi les gares des communes voisines (ex. Trégastel → Lannion). On
  // resserre à un rayon plausible "à l'intérieur ou collée à la commune" : 1500 m.
  // En mode adresse, la sémantique reste "il y a une gare à proximité raisonnable" :
  // on garde le seuil du label deriveLabel (≤ 1500 m).
  const STATION_INSIDE_THRESHOLD_M = 1500;
  const hasNearbyStation =
    nearestStationDistance !== null && nearestStationDistance <= STATION_INSIDE_THRESHOLD_M;

  return {
    mode: data.mode,
    addressLabel: data.address.label,
    mobility: {
      label: data.mobility.label,
      hasNearbyStation,
      nearestStationDistanceMeters: isCommune ? null : nearestStationDistance,
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
          priceLevel: data.realEstate.priceLevel ?? null,
          medianPricePerSquareMeter: data.realEstate.medianPricePerSquareMeter ?? null,
          nearbyTransactionsCount: data.realEstate.nearbyTransactionsCount ?? null,
        }
      : null,
    neighborhood: {
      label: data.neighborhood.label,
      categoriesPresent,
    },
    demographics: data.demographics
      ? {
          nomCommune: data.demographics.nomCommune,
          population: data.demographics.population,
          revenuMedian: data.demographics.revenuMedian,
          tauxPauvrete: data.demographics.tauxPauvrete,
          ageDistribution: data.demographics.ageDistribution
            ? {
                pct0_14: data.demographics.ageDistribution.pct0_14,
                pct15_29: data.demographics.ageDistribution.pct15_29,
                pct30_44: data.demographics.ageDistribution.pct30_44,
                pct45_59: data.demographics.ageDistribution.pct45_59,
                pct60_74: data.demographics.ageDistribution.pct60_74,
                pct75Plus: data.demographics.ageDistribution.pct75Plus,
              }
            : null,
          national: data.demographics.nationalStats
            ? {
                revenuMedian: data.demographics.nationalStats.revenuMedian,
                tauxPauvrete: data.demographics.nationalStats.tauxPauvrete,
                ageDistribution: data.demographics.nationalStats.ageDistribution
                  ? {
                      pct0_14: data.demographics.nationalStats.ageDistribution.pct0_14,
                      pct15_29: data.demographics.nationalStats.ageDistribution.pct15_29,
                      pct30_44: data.demographics.nationalStats.ageDistribution.pct30_44,
                      pct45_59: data.demographics.nationalStats.ageDistribution.pct45_59,
                      pct60_74: data.demographics.nationalStats.ageDistribution.pct60_74,
                      pct75Plus: data.demographics.nationalStats.ageDistribution.pct75Plus,
                    }
                  : null,
              }
            : null,
        }
      : null,
    cadastre: data.cadastre
      ? {
          urbanZoneType: data.cadastre.urbanZone?.type ?? null,
          urbanZoneLabel: data.cadastre.urbanZone?.label ?? null,
          parcelSurface: data.cadastre.parcel?.contenance ?? null,
        }
      : null,
    elections: data.elections
      ? {
          scrutin: data.elections.scrutin,
          participationPct: data.elections.participationPct,
          nationalParticipationPct: data.elections.nationalParticipationPct,
          topCandidats: [...data.elections.candidates]
            .sort((a, b) => b.pctCommune - a.pctCommune)
            .slice(0, 3)
            .map((c) => ({
              candidat: c.candidat,
              parti: c.parti,
              pctCommune: c.pctCommune,
              pctNational: c.pctNational,
            })),
        }
      : null,
    climate: data.climate
      ? {
          temperatureC: data.climate.temperatureC,
          precipitationMm: data.climate.precipitationMm,
          sunshineHours: data.climate.sunshineHours,
          nationalTemperatureC: data.climate.national.temperatureC,
          nationalPrecipitationMm: data.climate.national.precipitationMm,
          nationalSunshineHours: data.climate.national.sunshineHours,
        }
      : null,
  };
}
