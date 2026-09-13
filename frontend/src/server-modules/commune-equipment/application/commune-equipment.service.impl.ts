import type { CommuneEquipmentService } from "./commune-equipment.service";
import { EQUIPMENT_FAMILIES, type CommuneEquipment } from "../domain/commune-equipment.types";
import type { CommuneEquipmentProvider } from "../infrastructure/commune-equipment.provider";

const ALL_TYPEQU = EQUIPMENT_FAMILIES.flatMap((family) => family.rubrics.flatMap((rubric) => rubric.typequ));

function sum(counts: Record<string, number>, typequ: readonly string[]): number {
  return typequ.reduce((total, code) => total + (counts[code] ?? 0), 0);
}

const per10k = (count: number, population: number) => (count * 10_000) / population;

export class CommuneEquipmentServiceImpl implements CommuneEquipmentService {
  constructor(private readonly provider: CommuneEquipmentProvider) {}

  async getCommuneEquipment(codeCommune: string): Promise<CommuneEquipment | null> {
    try {
      const [counts, franceCounts, population, francePopulation] = await Promise.all([
        this.provider.countByTypequ(codeCommune, ALL_TYPEQU),
        this.provider.countByTypequ(null, ALL_TYPEQU),
        this.provider.getPopulation(codeCommune),
        this.provider.getPopulation("FRANCE"),
      ]);

      // Sans population, pas de densité ; sans aucun équipement, la commune n'est pas dans
      // la BPE sous ce code — c'est le cas de Paris, Lyon et Marseille, que la BPE ne
      // connaît que par arrondissement. La card ne s'affiche pas plutôt que de dire « 0 ».
      if (!population || population <= 0) return null;
      if (Object.values(counts).every((count) => count === 0)) return null;

      return {
        codeCommune,
        population,
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
