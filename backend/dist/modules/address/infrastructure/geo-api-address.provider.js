import { HttpClient } from "../../../shared/infrastructure/http/http-client.js";
/**
 * Address provider using Géoplateforme IGN (data.geopf.fr)
 * Replaces the old api-adresse.data.gouv.fr endpoint
 */
export class GeoApiAddressProvider {
    httpClient = new HttpClient();
    baseUrl = "https://data.geopf.fr/geocodage";
    async autocomplete(query) {
        try {
            const response = await this.httpClient.getJson(`${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=5`);
            return response.features.map((feature) => ({
                id: feature.properties.id,
                label: feature.properties.label,
                street: feature.properties.street ?? feature.properties.name,
                city: feature.properties.city,
                postcode: feature.properties.postcode,
                coordinates: {
                    latitude: feature.geometry.coordinates[1],
                    longitude: feature.geometry.coordinates[0],
                },
            }));
        }
        catch {
            return [];
        }
    }
    async reverseGeocode(lat, lon) {
        try {
            const response = await this.httpClient.getJson(`${this.baseUrl}/reverse?lon=${lon}&lat=${lat}`);
            const feature = response.features[0];
            if (!feature)
                return null;
            return {
                label: feature.properties.label,
                city: feature.properties.city,
                postcode: feature.properties.postcode,
                citycode: feature.properties.citycode ?? "",
                coordinates: {
                    latitude: feature.geometry.coordinates[1],
                    longitude: feature.geometry.coordinates[0],
                },
            };
        }
        catch {
            return null;
        }
    }
}
//# sourceMappingURL=geo-api-address.provider.js.map