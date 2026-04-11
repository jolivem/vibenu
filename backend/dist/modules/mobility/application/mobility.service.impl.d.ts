import type { MobilityService } from "./mobility.service.js";
import type { MobilityAnalysis } from "../domain/mobility.types.js";
import type { TransportProvider } from "../infrastructure/transport.provider.js";
export declare class MobilityServiceImpl implements MobilityService {
    private readonly transportProvider;
    constructor(transportProvider: TransportProvider);
    getMobilityData(lat: number, lon: number): Promise<MobilityAnalysis>;
}
