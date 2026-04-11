/**
 * Air quality provider using Atmo France API
 * Requires an API token (set ATMO_API_TOKEN env var)
 * Falls back to a neutral score when token is missing or API fails
 *
 * The provider accepts a code_insee to query the commune-level air quality index.
 * API endpoint pattern: /api/v1/communes/{code_insee}/indices/atmo
 */
export class AtmoAirQualityProvider {
    apiToken = process.env.ATMO_API_TOKEN ?? "";
    baseUrl = "https://api.atmo-france.org/api/v1";
    async getAirQuality(lat, lon, codeInsee) {
        // Without API token or code_insee, return neutral fallback
        if (!this.apiToken || !codeInsee) {
            return this.getFallbackData(!this.apiToken
                ? "Token Atmo non configuré"
                : "Code INSEE non disponible");
        }
        try {
            const today = new Date().toISOString().split("T")[0];
            const response = await fetch(`${this.baseUrl}/communes/${codeInsee}/indices/atmo?date_diffusion=${today}&api_token=${this.apiToken}`, { headers: { Accept: "application/json" } });
            if (!response.ok) {
                console.warn(`Atmo API error: ${response.status}`);
                return this.getFallbackData("API Atmo indisponible");
            }
            const data = (await response.json());
            if (!data.data || data.data.length === 0) {
                return this.getFallbackData("Aucun indice disponible");
            }
            return this.mapAtmoData(data.data[0]);
        }
        catch (error) {
            console.warn("Atmo provider error:", error);
            return this.getFallbackData("Erreur API Atmo");
        }
    }
    mapAtmoData(indice) {
        // code_qual: 1=Bon → AQI~25, 2=Moyen → AQI~75, 3=Dégradé → AQI~125, 4=Mauvais → AQI~175, 5=Très mauvais → AQI~250
        const aqiMapping = {
            1: 25,
            2: 75,
            3: 125,
            4: 175,
            5: 250,
        };
        const levelMapping = {
            1: "bon",
            2: "moyen",
            3: "dégradé",
            4: "mauvais",
            5: "très_mauvais",
        };
        const aqi = aqiMapping[indice.code_qual] ?? 75;
        const level = levelMapping[indice.code_qual] ?? "moyen";
        return {
            aqi,
            level,
            pollutants: this.extractSubIndices(indice),
            source: indice.source ?? "Atmo France",
            lastUpdated: new Date(indice.date),
        };
    }
    extractSubIndices(indice) {
        const pollutants = {};
        // Sub-indices are 1-5 scale, convert to approximate µg/m³ for display
        if (indice.code_no2 !== undefined)
            pollutants.no2 = indice.code_no2;
        if (indice.code_o3 !== undefined)
            pollutants.o3 = indice.code_o3;
        if (indice.code_pm10 !== undefined)
            pollutants.pm10 = indice.code_pm10;
        if (indice.code_pm25 !== undefined)
            pollutants.pm25 = indice.code_pm25;
        if (indice.code_so2 !== undefined)
            pollutants.so2 = indice.code_so2;
        return pollutants;
    }
    getFallbackData(source) {
        return {
            aqi: 50,
            level: "moyen",
            pollutants: {},
            source,
            lastUpdated: new Date(),
        };
    }
}
//# sourceMappingURL=atmo-air-quality.provider.js.map