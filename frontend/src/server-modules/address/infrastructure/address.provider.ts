import type { AddressDetails, AddressSuggestion } from "../domain/address.types";

export interface AddressProvider {
  autocomplete(query: string): Promise<AddressSuggestion[]>;
  reverseGeocode(lat: number, lon: number): Promise<AddressDetails | null>;
}
