import type { AddressSuggestion } from "../domain/address.types";

export interface AddressSearchService {
  search(query: string): Promise<AddressSuggestion[]>;
}
