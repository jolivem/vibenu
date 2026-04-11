import type { RealEstateService } from "./real-estate.service.js";
import type { RealEstateAnalysis } from "../domain/real-estate.types.js";
import type { RealEstateProvider } from "../infrastructure/real-estate.provider.js";
export declare class RealEstateServiceImpl implements RealEstateService {
    private readonly realEstateProvider;
    constructor(realEstateProvider: RealEstateProvider);
    getMarketData(lat: number, lon: number, codeInsee?: string): Promise<RealEstateAnalysis>;
}
