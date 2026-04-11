/**
 * Risk provider using Géorisques API v1
 * Uses the comprehensive report endpoint for a single-call risk assessment
 * API doc: https://www.georisques.gouv.fr/doc-api
 * Rate limit: 1 call/s on resultats_rapport_risque
 */
export class GeorisquesRiskProvider {
    baseUrl = "https://www.georisques.gouv.fr/api/v1";
    riskLabels = {
        inondation: "Risque d'inondation",
        remonteeNappe: "Remontée de nappe",
        risqueCotier: "Risque côtier",
        seisme: "Risque sismique",
        mouvementTerrain: "Mouvements de terrain",
        reculTraitCote: "Recul du trait de côte",
        retraitGonflementArgile: "Retrait-gonflement des argiles",
        avalanche: "Risque d'avalanche",
        feuForet: "Feu de forêt",
        eruptionVolcanique: "Éruption volcanique",
        cyclone: "Cyclone",
        radon: "Exposition au radon",
        icpe: "Installation classée (ICPE)",
        nucleaire: "Risque nucléaire",
        canalisationsMatieresDangereuses: "Canalisations dangereuses",
        pollutionSols: "Pollution des sols",
        ruptureBarrage: "Rupture de barrage",
        risqueMinier: "Risque minier",
    };
    async getLocationRisks(lat, lon) {
        try {
            const response = await fetch(`${this.baseUrl}/resultats_rapport_risque?latlon=${lon},${lat}`, { headers: { Accept: "application/json" } });
            if (!response.ok) {
                console.warn(`Géorisques API error: ${response.status} ${response.statusText}`);
                return this.getDefaultRisks();
            }
            const data = (await response.json());
            return this.parseRapport(data);
        }
        catch (error) {
            console.warn("Géorisques API error, using fallback:", error);
            return this.getDefaultRisks();
        }
    }
    parseRapport(data) {
        const risks = [];
        // Natural risks
        for (const [code, risque] of Object.entries(data.risquesNaturels)) {
            risks.push(this.mapRisque(code, risque));
        }
        // Technological risks
        for (const [code, risque] of Object.entries(data.risquesTechnologiques)) {
            risks.push(this.mapRisque(code, risque));
        }
        // Only return present/relevant risks, plus always include key ones
        const keyRiskCodes = new Set([
            "inondation",
            "seisme",
            "mouvementTerrain",
            "retraitGonflementArgile",
            "radon",
            "icpe",
        ]);
        return risks.filter((r) => r.level !== "absent" || keyRiskCodes.has(r.code));
    }
    mapRisque(code, risque) {
        const name = this.riskLabels[code] ?? code;
        const level = this.parseLevel(risque);
        return {
            code,
            name,
            level,
            message: this.buildMessage(name, level, risque),
        };
    }
    parseLevel(risque) {
        if (!risque.present)
            return "absent";
        const statut = (risque.libelleStatutAdresse ??
            risque.libelleStatutCommune ??
            "").toLowerCase();
        if (statut.includes("élevé") || statut.includes("important") || statut.includes("fort")) {
            return "élevé";
        }
        if (statut.includes("modéré") || statut.includes("moyen")) {
            return "modéré";
        }
        // Risk is present but no severity detail → default to "faible"
        return "faible";
    }
    buildMessage(name, level, risque) {
        if (level === "absent") {
            return `Pas de ${name.toLowerCase()} identifié sur ce secteur.`;
        }
        const detail = risque.libelleStatutAdresse ?? risque.libelleStatutCommune ?? "";
        const suffix = detail ? ` (${detail})` : "";
        switch (level) {
            case "élevé":
                return `⚠️ ${name} élevé${suffix}. Étude spécialisée recommandée.`;
            case "modéré":
                return `${name} modéré${suffix}. À investiguer avant décision.`;
            case "faible":
                return `${name} faible${suffix}.`;
        }
    }
    getDefaultRisks() {
        return [
            {
                code: "inondation",
                name: "Risque d'inondation",
                level: "faible",
                message: "Données Géorisques indisponibles — vérifier manuellement sur georisques.gouv.fr.",
            },
            {
                code: "seisme",
                name: "Risque sismique",
                level: "faible",
                message: "Données Géorisques indisponibles — vérifier manuellement sur georisques.gouv.fr.",
            },
            {
                code: "retraitGonflementArgile",
                name: "Retrait-gonflement des argiles",
                level: "faible",
                message: "Données Géorisques indisponibles — vérifier manuellement sur georisques.gouv.fr.",
            },
        ];
    }
}
//# sourceMappingURL=brgm-risk.provider.js.map