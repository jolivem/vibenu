export class RealEstateServiceImpl {
    realEstateProvider;
    constructor(realEstateProvider) {
        this.realEstateProvider = realEstateProvider;
    }
    async getMarketData(lat, lon, codeInsee) {
        const data = await this.realEstateProvider.getNearbyTransactions(lat, lon, 1000, codeInsee);
        let score = 50;
        if ((data.nearbyTransactionsCount ?? 0) >= 10)
            score += 15;
        if (data.confidence === "élevée")
            score += 10;
        if (data.priceLevel === "moyen")
            score += 10;
        if (data.priceLevel === "élevé")
            score += 5;
        return {
            ...data,
            score: Math.min(score, 100),
        };
    }
}
//# sourceMappingURL=real-estate.service.impl.js.map