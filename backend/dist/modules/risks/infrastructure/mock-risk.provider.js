export class MockRiskProvider {
    async getLocationRisks() {
        return [
            {
                code: "argiles",
                name: "Retrait-gonflement des argiles",
                level: "modéré",
                message: "Vigilance modérée à vérifier avant achat.",
            },
            {
                code: "inondation",
                name: "Inondation",
                level: "faible",
                message: "Aucun signal fort sur l'emplacement étudié.",
            },
            {
                code: "industriel",
                name: "Risque industriel",
                level: "absent",
                message: "Pas de risque industriel significatif détecté à proximité immédiate.",
            },
        ];
    }
}
//# sourceMappingURL=mock-risk.provider.js.map