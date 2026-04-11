import type { AirQualityAnalysis, AirQualityData } from "../domain/air-quality.types.js";
export interface AirQualityService {
    getAirQualityData(lat: number, lon: number, codeInsee?: string): Promise<AirQualityAnalysis>;
}
export declare class AirQualityServiceImpl implements AirQualityService {
    private readonly airQualityProvider;
    constructor(airQualityProvider: AirQualityProvider);
    getAirQualityData(lat: number, lon: number, codeInsee?: string): Promise<AirQualityAnalysis>;
    private analyzeAirQuality;
}
export interface AirQualityProvider {
    getAirQuality(lat: number, lon: number, codeInsee?: string): Promise<AirQualityData>;
}
