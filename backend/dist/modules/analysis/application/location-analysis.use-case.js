export class LocationAnalysisUseCase {
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    async analyze(input) {
        return this.execute(input);
    }
    async execute(input) {
        // Resolve address first — we need codeInsee for DVF and Atmo
        const addressDetails = await this.dependencies.addressProvider.reverseGeocode(input.lat, input.lon);
        const codeInsee = addressDetails?.citycode;
        const [mobility, risks, realEstate, airQuality, neighborhood] = await Promise.all([
            this.dependencies.mobilityService.getMobilityData(input.lat, input.lon),
            this.dependencies.riskService.getRiskData(input.lat, input.lon),
            this.dependencies.realEstateService.getMarketData(input.lat, input.lon, codeInsee),
            this.dependencies.airQualityService.getAirQualityData(input.lat, input.lon, codeInsee),
            this.dependencies.neighborhoodService.getNeighborhoodData(input.lat, input.lon),
        ]);
        const address = {
            label: input.label ?? addressDetails?.label ?? `${input.lat}, ${input.lon}`,
            city: input.city ?? addressDetails?.city ?? "Inconnue",
            postcode: input.postcode ?? addressDetails?.postcode ?? "",
            latitude: input.lat,
            longitude: input.lon,
        };
        const scores = this.dependencies.scoreService.compute({
            mobilityScore: mobility.score,
            riskScore: risks.score,
            realEstateScore: realEstate.score,
            environmentScore: airQuality.score,
            neighborhoodScore: neighborhood.score,
        });
        const summary = this.dependencies.summaryService.build({
            mobilityScore: mobility.score,
            riskScore: risks.score,
            realEstateScore: realEstate.score,
            addressLabel: address.label,
        });
        return {
            address,
            map: {
                center: { lat: input.lat, lon: input.lon },
                zoom: 14,
            },
            scores,
            mobility,
            risks,
            realEstate,
            airQuality,
            neighborhood,
            summary,
        };
    }
}
//# sourceMappingURL=location-analysis.use-case.js.map