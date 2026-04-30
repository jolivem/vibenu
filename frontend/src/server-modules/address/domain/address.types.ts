import type { Coordinates } from "../../../server-shared/domain/common.types";

export type AddressSuggestionType =
  | "housenumber"
  | "street"
  | "locality"
  | "municipality";

export interface AddressSuggestion {
  id: string;
  label: string;
  street?: string;
  city: string;
  postcode: string;
  citycode?: string; // code INSEE — utile quand type === "municipality"
  type?: AddressSuggestionType;
  coordinates: Coordinates;
}

export interface AddressDetails {
  label: string;
  city: string;
  postcode: string;
  citycode: string; // code INSEE
  coordinates: Coordinates;
}
