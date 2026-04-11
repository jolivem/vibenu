export class SummaryBuilderService {
    build(input) {
        const strengths = [];
        const warnings = [];
        if (input.mobilityScore >= 70)
            strengths.push("Bonne desserte en transports");
        else if (input.mobilityScore >= 45)
            strengths.push("Accès correct aux transports du quotidien");
        else
            warnings.push("Desserte en transports limitée");
        if (input.riskScore >= 70)
            strengths.push("Profil de risque plutôt favorable");
        else
            warnings.push("Quelques vérifications de risque sont recommandées avant engagement");
        if (input.realEstateScore >= 65)
            strengths.push("Contexte immobilier local relativement lisible");
        else
            warnings.push("Peu de repères immobiliers exploitables dans la zone proche");
        const shortText = `${input.addressLabel} présente un niveau d'intérêt global utile pour une première analyse. Les indicateurs doivent être confirmés avant signature.`;
        return {
            strengths,
            warnings,
            shortText,
        };
    }
}
//# sourceMappingURL=summary-builder.service.js.map