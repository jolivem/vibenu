import type { BuildingInfo, RealEstateAnalysis } from "../domain/real-estate.types";

export type RealEstateMarketData = RealEstateAnalysis;

export interface RealEstateProvider {
  getNearbyTransactions(
    lat: number,
    lon: number,
    radiusMeters: number,
    codeInsee?: string,
  ): Promise<RealEstateMarketData>;

  /** Toutes les transactions DVF d'une commune, filtrées par code INSEE. */
  getCommuneTransactions(codeInsee: string): Promise<RealEstateMarketData>;
}

/** Fiche des immeubles, par identifiant de parcelle. */
export interface BuildingInfoProvider {
  getBuildings(parcelIds: string[]): Promise<Map<string, BuildingInfo>>;
}
