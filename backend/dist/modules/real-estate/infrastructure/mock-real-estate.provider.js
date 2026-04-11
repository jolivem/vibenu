export class MockRealEstateProvider {
    async getNearbyTransactions() {
        return {
            nearbyTransactionsCount: 14,
            priceLevel: "élevé",
            confidence: "moyenne",
            medianPricePerSquareMeter: 6150,
        };
    }
}
//# sourceMappingURL=mock-real-estate.provider.js.map