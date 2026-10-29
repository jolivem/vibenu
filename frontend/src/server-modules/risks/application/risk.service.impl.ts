import type { RiskService } from "./risk.service";
import type { FloodWindow, FloodZone, RiskAnalysis, RiskCategory } from "../domain/risk.types";
import type { ClayExposure, PostgisLocalRiskProvider } from "../infrastructure/local-risk.provider";
import type { RiskProvider, RiskScope } from "../infrastructure/risk.provider";
import type { FloodZoneProvider } from "../infrastructure/flood-zone.provider";
import type { RiskCategoryLevel } from "../../../server-shared/domain/common.types";

export class RiskServiceImpl implements RiskService {
  /**
   * `floodZoneProvider` est optionnel : les pages commune SEO construisent ce service pour
   * le seul rapport Géorisques, sans carte à alimenter. Sans provider, `getFloodZones`
   * rend une liste vide au lieu d'exiger un branchement inutile.
   */
  constructor(
    private readonly riskProvider: RiskProvider,
    private readonly floodZoneProvider?: FloodZoneProvider,
    /** Données Géorisques importées (argiles, GASPAR). Optionnel, comme le précédent. */
    private readonly localProvider?: PostgisLocalRiskProvider,
  ) {}

  async getFloodZones(window: FloodWindow): Promise<FloodZone[]> {
    if (!this.floodZoneProvider) return [];
    return this.floodZoneProvider.getFloodZones(window);
  }

  async getRiskData(lat: number, lon: number, scope?: RiskScope, citycode?: string): Promise<RiskAnalysis> {
    const local = this.localProvider;
    const [reported, clay, catnat] = await Promise.all([
      this.riskProvider.getLocationRisks(lat, lon, scope),
      // La carte des argiles se lit au point : rien à en tirer pour une page de ville.
      local && scope !== "commune" ? local.getClayExposure(lat, lon, citycode) : Promise.resolve(null),
      local && citycode ? local.getCatnat(citycode) : Promise.resolve(null),
    ]);
    const categories = reported.map((category) =>
      category.code === "retraitGonflementArgile" ? withClayMap(category, clay) : category,
    );

    // « présent » passe devant « faible » : un risque que Géorisques signale sans le
    // graduer n'est pas un risque connu comme faible. « inconnu » passe devant
    // « absent » pour la même raison — ne rien savoir n'est pas savoir qu'il n'y a rien.
    const severityWeights: Record<RiskCategoryLevel, number> = {
      élevé: 50,
      modéré: 30,
      présent: 20,
      faible: 10,
      inconnu: 5,
      absent: 0,
    };

    // Sort categories from highest to lowest risk
    categories.sort((a, b) => severityWeights[b.level] - severityWeights[a.level]);

    // Global level = highest individual category level
    const highestLevel: RiskCategoryLevel = categories[0]?.level ?? "absent";
    const levelMap: Record<RiskCategoryLevel, RiskAnalysis["level"]> = {
      élevé: "élevé",
      modéré: "modéré",
      présent: "présent",
      faible: "faible",
      inconnu: "inconnu",
      // Aucun risque identifié sur le secteur : « faible » reste juste, c'est une
      // information positive et non une absence de donnée.
      absent: "faible",
    };
    const level = levelMap[highestLevel];

    return {
      categories,
      level,
      ...(local && citycode ? { catnat } : {}),
    };
  }
}

const CLAY_LEVELS: Record<1 | 2 | 3, RiskCategory["level"]> = { 1: "faible", 2: "modéré", 3: "élevé" };
const CLAY_WORDS: Record<0 | 1 | 2 | 3, string> = { 0: "a priori nulle", 1: "faible", 2: "moyenne", 3: "forte" };

/**
 * Les argiles, quand le rapport Géorisques a manqué : le niveau de la carte d'exposition 2026
 * importée. Quand le rapport a répondu, il fait foi — c'est la lecture que reprend l'état des
 * risques remis à l'acheteur — et un désaccord avec la carte est seulement journalisé.
 */
function withClayMap(category: RiskCategory, clay: ClayExposure | null): RiskCategory {
  if (!clay || !clay.covered) return category;
  if (!category.unavailable) {
    const expected = clay.niveau === 0 ? "absent" : CLAY_LEVELS[clay.niveau];
    if (category.level !== "inconnu" && category.level !== expected) {
      console.warn(`Argiles : Géorisques « ${category.level} », carte 2026 « ${expected} »`);
    }
    return category;
  }
  const level = clay.niveau === 0 ? "absent" : CLAY_LEVELS[clay.niveau];
  return {
    code: category.code,
    name: category.name,
    level,
    message:
      `Exposition ${CLAY_WORDS[clay.niveau]} sur la carte des argiles 2026 (BRGM) ; ` +
      "rapport Géorisques indisponible, à confirmer sur georisques.gouv.fr.",
    statusDetail: `Exposition ${CLAY_WORDS[clay.niveau]} (carte 2026)`,
    communeFallback: false,
    localSource: "argiles-2026",
  };
}
