import type { RealEstateService } from "./real-estate.service";
import type { RealEstateAnalysis } from "../domain/real-estate.types";
import type { BuildingInfoProvider, RealEstateProvider } from "../infrastructure/real-estate.provider";
import type { AnalysisMode } from "../../../server-shared/types/location-analysis.dto";

/** Départements du Livre foncier : Moselle, Bas-Rhin, Haut-Rhin. DVF ne les publie pas. */
const LIVRE_FONCIER_DEPARTMENTS = ["57", "67", "68"];

export class RealEstateServiceImpl implements RealEstateService {
  constructor(
    private readonly realEstateProvider: RealEstateProvider,
    /** Fiche des immeubles (BDNB) ; sans lui, les ventes s'affichent sans fiche. */
    private readonly buildingInfoProvider?: BuildingInfoProvider,
  ) {}

  async getMarketData(
    lat: number,
    lon: number,
    codeInsee?: string,
    options?: { mode?: AnalysisMode },
  ): Promise<RealEstateAnalysis> {
    // Décidé sur la commune de l'adresse : une vente d'un département voisin, à moins d'1 km,
    // ne ferait pas un prix pour Strasbourg ou Metz.
    if (codeInsee && LIVRE_FONCIER_DEPARTMENTS.includes(codeInsee.slice(0, 2))) {
      return {
        notPublished: "alsace-moselle",
        nearbyTransactionsCount: 0,
        markets: { appartement: null, maison: null },
        transactionFeatures: [],
        buildings: [],
      };
    }
    const market = options?.mode === "commune" && codeInsee
      ? await this.realEstateProvider.getCommuneTransactions(codeInsee)
      : await this.realEstateProvider.getNearbyTransactions(lat, lon, 1000, codeInsee);
    return this.withBuildingInfo(market);
  }

  /** Copie enrichie : le résultat DVF reste tel quel dans le cache du provider. */
  private async withBuildingInfo(market: RealEstateAnalysis): Promise<RealEstateAnalysis> {
    const buildings = market.buildings;
    if (!this.buildingInfoProvider || !buildings?.length) return market;
    const ids = buildings.map((b) => b.parcelId).filter((id): id is string => id !== null);
    const info = await this.buildingInfoProvider.getBuildings(ids);
    return {
      ...market,
      buildings: buildings.map((b) => ({ ...b, building: (b.parcelId && info.get(b.parcelId)) || null })),
    };
  }
}
