import type { AddressProvider } from "../infrastructure/address.provider.js";
import type { AddressSuggestionDto } from "../../../shared/types/location-analysis.dto.js";
export declare class AddressSearchUseCase {
    private readonly addressProvider;
    constructor(addressProvider: AddressProvider);
    execute(query: string): Promise<AddressSuggestionDto[]>;
}
