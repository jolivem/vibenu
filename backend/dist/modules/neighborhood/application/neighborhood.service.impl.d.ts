import type { NeighborhoodService } from "./neighborhood.service.js";
import type { NeighborhoodAnalysis } from "../domain/neighborhood.types.js";
import type { NeighborhoodProvider } from "../infrastructure/neighborhood.provider.js";
export declare class NeighborhoodServiceImpl implements NeighborhoodService {
    private readonly provider;
    constructor(provider: NeighborhoodProvider);
    getNeighborhoodData(lat: number, lon: number): Promise<NeighborhoodAnalysis>;
}
