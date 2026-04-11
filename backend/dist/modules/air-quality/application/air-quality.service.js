export class AirQualityServiceImpl {
    airQualityProvider;
    constructor(airQualityProvider) {
        this.airQualityProvider = airQualityProvider;
    }
    async getAirQualityData(lat, lon, codeInsee) {
        try {
            const data = await this.airQualityProvider.getAirQuality(lat, lon, codeInsee);
            return this.analyzeAirQuality(data);
        }
        catch (error) {
            console.error("Air quality service error:", error);
            // Return neutral score on error
            return {
                score: 50,
                level: "moyen",
                message: "Données de qualité de l'air indisponibles.",
            };
        }
    }
    analyzeAirQuality(data) {
        // Convert AQI to score (higher AQI = lower score)
        const score = Math.max(0, Math.min(100, 100 - (data.aqi / 5)));
        let message = "";
        switch (data.level) {
            case "bon":
                message = "Qualité de l'air excellente.";
                break;
            case "moyen":
                message = "Qualité de l'air acceptable.";
                break;
            case "dégradé":
                message = "Qualité de l'air dégradée, surveiller les pics de pollution.";
                break;
            case "mauvais":
                message = "Qualité de l'air mauvaise, limiter les activités extérieures.";
                break;
            case "très_mauvais":
                message = "Qualité de l'air très mauvaise, éviter les sorties.";
                break;
        }
        return {
            score: Math.round(score),
            level: data.level,
            message,
        };
    }
}
//# sourceMappingURL=air-quality.service.js.map