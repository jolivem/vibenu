import type { Coordinates } from "../../../server-shared/domain/common.types";

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
  citycode: string; // code INSEE
  coordinates: Coordinates;
}
