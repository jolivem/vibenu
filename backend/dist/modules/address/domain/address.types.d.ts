import type { Coordinates } from "../../../shared/domain/common.types.js";
export interface AddressSuggestion {
    id: string;
    label: string;
    street?: string;
    city: string;
    postcode: string;
    coordinates: Coordinates;
}
export interface AddressDetails {
    label: string;
    city: string;
    postcode: string;
    citycode: string;
    coordinates: Coordinates;
}
