export class RiskServiceImpl {
    riskProvider;
    constructor(riskProvider) {
        this.riskProvider = riskProvider;
    }
    async getRiskData(lat, lon) {
        const categories = await this.riskProvider.getLocationRisks(lat, lon);
        const severityWeights = {
            absent: 0,
            faible: 10,
            modéré: 25,
            élevé: 45,
        };
        const penalty = categories.reduce((sum, category) => sum + severityWeights[category.level], 0);
        const score = Math.max(20, 100 - penalty);
        let level = "faible";
        if (score < 45)
            level = "élevé";
        else if (score < 70)
            level = "modéré";
        return {
            categories,
            level,
            score,
        };
    }
}
//# sourceMappingURL=risk.service.impl.js.map