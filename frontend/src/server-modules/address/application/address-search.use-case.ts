import type { AddressProvider } from "../infrastructure/address.provider";
import type { AddressSuggestionDto } from "../../../server-shared/types/location-analysis.dto";

export class AddressSearchUseCase {
  constructor(private readonly addressProvider: AddressProvider) {}

  async execute(query: string): Promise<AddressSuggestionDto[]> {
    const suggestions = await this.addressProvider.autocomplete(query);

    return suggestions.map((suggestion) => ({
      id: suggestion.id,
      label: suggestion.label,
      street: suggestion.street,
      city: suggestion.city,
      postcode: suggestion.postcode,
      latitude: suggestion.coordinates.latitude,
      longitude: suggestion.coordinates.longitude,
    }));
  }
}
