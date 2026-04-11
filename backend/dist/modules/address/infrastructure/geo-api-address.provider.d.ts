import type { AddressProvider } from "./address.provider.js";
import type { AddressDetails, AddressSuggestion } from "../domain/address.types.js";
/**
 * Address provider using Géoplateforme IGN (data.geopf.fr)
 * Replaces the old api-adresse.data.gouv.fr endpoint
 */
export declare class GeoApiAddressProvider implements AddressProvider {
    private readonly httpClient;
    private readonly baseUrl;
    autocomplete(query: string): Promise<AddressSuggestion[]>;
    reverseGeocode(lat: number, lon: number): Promise<AddressDetails | null>;
}
