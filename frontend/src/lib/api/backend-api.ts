import { env } from "@/lib/config/env";
import type { AddressSuggestionDto, LocationAnalysisDto } from "@/types/location-analysis";

export const backendApi = {
  async searchAddress(query: string): Promise<AddressSuggestionDto[]> {
    const response = await fetch(`${env.apiBaseUrl}/api/address/search?q=${encodeURIComponent(query)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Impossible de rechercher les adresses.");
    }

    return (await response.json()) as AddressSuggestionDto[];
  },

  async analyzeLocation(input: {
    lat: number;
    lon: number;
    label?: string;
    city?: string;
    postcode?: string;
  }): Promise<LocationAnalysisDto> {
    const params = new URLSearchParams({
      lat: String(input.lat),
      lon: String(input.lon),
    });

    if (input.label) params.set("label", input.label);
    if (input.city) params.set("city", input.city);
    if (input.postcode) params.set("postcode", input.postcode);

    const response = await fetch(`${env.apiBaseUrl}/api/location/analyze?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Impossible d'analyser cette adresse.");
    }

    return (await response.json()) as LocationAnalysisDto;
  },
};
