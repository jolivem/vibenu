import type { AddressProvider } from "./address.provider.js";
import type { AddressDetails, AddressSuggestion } from "../domain/address.types.js";
import { HttpClient } from "../../../shared/infrastructure/http/http-client.js";

interface GeoPlateformeFeature {
  properties: {
    id: string;
    label: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city: string;
    postcode: string;
    citycode: string;
    context: string;
    score: number;
    _type: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number]; // [lon, lat]
  };
}

interface GeoPlateformeResponse {
  type: string;
  features: GeoPlateformeFeature[];
}

/**
 * Address provider using Géoplateforme IGN (data.geopf.fr)
 * Replaces the old api-adresse.data.gouv.fr endpoint
 */
export class GeoApiAddressProvider implements AddressProvider {
  private readonly httpClient = new HttpClient();
  private readonly baseUrl = "https://data.geopf.fr/geocodage";

  async autocomplete(query: string): Promise<AddressSuggestion[]> {
    try {
      const response = await this.httpClient.getJson<GeoPlateformeResponse>(
        `${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=5`,
      );

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
    } catch {
      return [];
    }
  }

  async reverseGeocode(lat: number, lon: number): Promise<AddressDetails | null> {
    try {
      const response = await this.httpClient.getJson<GeoPlateformeResponse>(
        `${this.baseUrl}/reverse?lon=${lon}&lat=${lat}`,
      );
      const feature = response.features[0];

      if (!feature) return null;

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
    } catch {
      return null;
    }
  }
}
