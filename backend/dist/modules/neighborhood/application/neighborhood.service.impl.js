export class NeighborhoodServiceImpl {
    provider;
    constructor(provider) {
        this.provider = provider;
    }
    async getNeighborhoodData(lat, lon) {
        const pois = await this.provider.findNearbyPois(lat, lon, 800);
        // Score based on diversity and proximity of essential services
        const essentialCategories = [
            "school",
            "supermarket",
            "bakery",
            "pharmacy",
            "doctor",
            "park",
        ];
        const foundCategories = new Set(pois.map((p) => p.category));
        const essentialFound = essentialCategories.filter((c) => foundCategories.has(c)).length;
        // Base score: diversity of essential services (0-60 pts)
        let score = Math.round((essentialFound / essentialCategories.length) * 60);
        // Bonus: total POI count (0-25 pts)
        score += Math.min(25, Math.round(pois.length * 1.5));
        // Bonus: something very close (<200m) (0-15 pts)
        const veryClose = pois.filter((p) => p.distanceMeters <= 200).length;
        score += Math.min(15, veryClose * 3);
        score = Math.min(100, score);
        let label = "peu équipé";
        if (score >= 70)
            label = "bien équipé";
        else if (score >= 40)
            label = "équipement moyen";
        return {
            pois: pois.slice(0, 15), // Top 15 closest
            score,
            label,
        };
    }
}
//# sourceMappingURL=neighborhood.service.impl.js.map