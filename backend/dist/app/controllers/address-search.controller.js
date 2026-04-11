import { AddressSearchUseCase } from "../../modules/address/application/address-search.use-case.js";
import { GeoApiAddressProvider } from "../../modules/address/infrastructure/geo-api-address.provider.js";
export const makeAddressSearchController = () => {
    const provider = new GeoApiAddressProvider();
    const useCase = new AddressSearchUseCase(provider);
    return {
        handle: async (query) => useCase.execute(query),
    };
};
//# sourceMappingURL=address-search.controller.js.map