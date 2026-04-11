/**
 * Real estate provider using DVF (Demandes de Valeurs Foncières) via Cerema API
 * Fetches actual property transactions from the French open dataset
 * API: https://apidf-preprod.cerema.fr/dvf_opendata/geomutations/
 */
export class DvfRealEstateProvider {
    dvfApiUrl = "https://apidf-preprod.cerema.fr/dvf_opendata/geomutations";
    async getNearbyTransactions(lat, lon, _radiusMeters, codeInsee) {
        try {
            let url;
            if (codeInsee) {
                // Query by INSEE code — most reliable
                url = `${this.dvfApiUrl}/?code_insee=${codeInsee}&page_size=100`;
            }
            else {
                // Fallback: query by lat/lon bounding box
                const delta = 0.005; // ~500m
                url = `${this.dvfApiUrl}/?in_bbox=${lon - delta},${lat - delta},${lon + delta},${lat + delta}&page_size=100`;
            }
            const response = await fetch(url, {
                headers: { Accept: "application/json" },
            });
            if (!response.ok) {
                console.warn(`DVF API error: ${response.status} ${response.statusText}`);
                return this.getFallbackData();
            }
            const data = (await response.json());
            return this.analyzeTransactions(data.features);
        }
        catch (error) {
            console.error("DVF provider error:", error);
            return this.getFallbackData();
        }
    }
    analyzeTransactions(features) {
        if (features.length === 0) {
            return this.getFallbackData();
        }
        // Filter: only sales of apartments/houses
        const sales = features.filter((f) => {
            const type = f.properties.libtypbien.toLowerCase();
            const nature = f.properties.libnatmut.toLowerCase();
            return (nature.includes("vente") &&
                (type.includes("appartement") || type.includes("maison")));
        });
        if (sales.length === 0) {
            return this.getFallbackData();
        }
        // Keep only recent transactions (last 3 years)
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        const recent = sales.filter((f) => new Date(f.properties.datemut) >= threeYearsAgo);
        const pool = recent.length > 0 ? recent : sales;
        // Calculate price per m²
        const pricesPerSqm = pool
            .map((f) => {
            const price = parseFloat(f.properties.valeurfonc);
            const surface = parseFloat(f.properties.sbati);
            if (!price || !surface || surface <= 0)
                return null;
            return price / surface;
        })
            .filter((p) => p !== null && p > 0 && p < 50_000) // filter outliers
            .sort((a, b) => a - b);
        if (pricesPerSqm.length === 0) {
            return this.getFallbackData();
        }
        const median = pricesPerSqm[Math.floor(pricesPerSqm.length / 2)];
        let priceLevel = "moyen";
        if (median < 2500)
            priceLevel = "faible";
        else if (median > 5000)
            priceLevel = "élevé";
        let confidence = "faible";
        if (pool.length >= 10)
            confidence = "moyenne";
        if (pool.length >= 50)
            confidence = "élevée";
        return {
            nearbyTransactionsCount: pool.length,
            priceLevel,
            confidence,
            medianPricePerSquareMeter: Math.round(median),
        };
    }
    getFallbackData() {
        return {
            nearbyTransactionsCount: 0,
            priceLevel: "moyen",
            confidence: "faible",
            medianPricePerSquareMeter: 0,
        };
    }
}
//# sourceMappingURL=dvf-real-estate.provider.js.map