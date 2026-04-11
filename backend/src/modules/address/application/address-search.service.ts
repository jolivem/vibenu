import type { AddressSuggestion } from "../domain/address.types.js";

export interface AddressSearchService {
  search(query: string): Promise<AddressSuggestion[]>;
}
