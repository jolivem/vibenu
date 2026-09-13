import type { CommuneEquipmentService } from "./commune-equipment.service";
import { EQUIPMENT_FAMILIES, type CommuneEquipment } from "../domain/commune-equipment.types";
import type { CommuneEquipmentProvider } from "../infrastructure/commune-equipment.provider";
import { CITIES, getCityForCodeInsee } from "@/lib/commune-slugs";

const ALL_TYPEQU = EQUIPMENT_FAMILIES.flatMap((family) => family.rubrics.flatMap((rubric) => rubric.typequ));

/**
 * Concentration anormale d'un code d'équipement dans un arrondissement : plus de la moitié
 * des équipements de la ville, sur un minimum de 5. Mêmes seuils que les pages commune SEO
 * (`postgis-commune-stats.provider.ts`).
 */
const CONCENTRATION_MAX_SHARE = 0.5;
const CONCENTRATION_MIN_CITY_COUNT = 5;

function sum(counts: Record<string, number>, typequ: readonly string[]): number {
  return typequ.reduce((total, code) => total + (counts[code] ?? 0), 0);
}

const per10k = (count: number, population: number) => (count * 10_000) / population;

/** Motif SQL de la ville d'un arrondissement (`132%`), ou `null` pour une autre commune. */
function arrondissementCityPattern(codeCommune: string): string | null {
  const city = getCityForCodeInsee(codeCommune);
  if (!city || CITIES[city].codeCommune === codeCommune) return null;
  return CITIES[city].sqlPattern;
}

export class CommuneEquipmentServiceImpl implements CommuneEquipmentService {
  constructor(private readonly provider: CommuneEquipmentProvider) {}

  async getCommuneEquipment(codeCommune: string): Promise<CommuneEquipment | null> {
    try {
      const cityPattern = arrondissementCityPattern(codeCommune);
      const [counts, franceCounts, population, francePopulation, cityCounts] = await Promise.all([
        this.provider.countByTypequ(codeCommune, ALL_TYPEQU),
        this.provider.countByTypequ(null, ALL_TYPEQU),
        this.provider.getPopulation(codeCommune),
        this.provider.getPopulation("FRANCE"),
        cityPattern ? this.provider.countByTypequLike(cityPattern, ALL_TYPEQU) : Promise.resolve(null),
      ]);

      // Sans population, pas de densité ; sans aucun équipement, la commune n'est pas dans
      // la BPE sous ce code — c'est le cas de Paris, Lyon et Marseille, que la BPE ne
      // connaît que par arrondissement. La card ne s'affiche pas plutôt que de dire « 0 ».
      if (!population || population <= 0) return null;
      if (Object.values(counts).every((count) => count === 0)) return null;

      const concentrated = (code: string) => {
        const cityCount = cityCounts?.[code] ?? 0;
        return cityCount >= CONCENTRATION_MIN_CITY_COUNT && (counts[code] ?? 0) / cityCount > CONCENTRATION_MAX_SHARE;
      };

      return {
        codeCommune,
        population,
        isArrondissement: cityPattern !== null,
        families: EQUIPMENT_FAMILIES.map((family) => ({
          title: family.title,
          rubrics: family.rubrics.map((rubric) => {
            const count = sum(counts, rubric.typequ);
            return {
              key: rubric.key,
              label: rubric.label,
              count,
              per10k: per10k(count, population),
              francePer10k:
                francePopulation && francePopulation > 0
                  ? per10k(sum(franceCounts, rubric.typequ), francePopulation)
                  : null,
              locationUncertain: cityCounts !== null && rubric.typequ.some(concentrated),
            };
          }),
        })),
      };
    } catch (error) {
      console.warn(`[commune-equipment] indisponible pour ${codeCommune}:`, error);
      return null;
    }
  }
}
