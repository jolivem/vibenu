export class AddressSearchUseCase {
    addressProvider;
    constructor(addressProvider) {
        this.addressProvider = addressProvider;
    }
    async execute(query) {
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
//# sourceMappingURL=address-search.use-case.js.map