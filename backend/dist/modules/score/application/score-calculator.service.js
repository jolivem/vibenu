export class ScoreCalculatorService {
    compute(input) {
        const globalScore = Math.round(input.mobilityScore * 0.25 +
            input.riskScore * 0.25 +
            input.realEstateScore * 0.2 +
            input.environmentScore * 0.1 +
            input.neighborhoodScore * 0.2);
        return {
            globalScore,
            mobilityScore: input.mobilityScore,
            riskScore: input.riskScore,
            realEstateScore: input.realEstateScore,
            environmentScore: input.environmentScore,
            neighborhoodScore: input.neighborhoodScore,
        };
    }
}
//# sourceMappingURL=score-calculator.service.js.map