import type { AddressSuggestionDto, CardInsightsDto, LocationAnalysisDto } from "@/types/location-analysis";

export const backendApi = {
  async searchAddress(query: string): Promise<AddressSuggestionDto[]> {
    const response = await fetch(`/api/address/search?q=${encodeURIComponent(query)}`, {
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
    type?: string;
    citycode?: string;
  }): Promise<LocationAnalysisDto> {
    const params = new URLSearchParams({
      lat: String(input.lat),
      lon: String(input.lon),
    });

    if (input.label) params.set("label", input.label);
    if (input.city) params.set("city", input.city);
    if (input.postcode) params.set("postcode", input.postcode);
    if (input.type) params.set("type", input.type);
    if (input.citycode) params.set("citycode", input.citycode);

    const response = await fetch(`/api/location/analyze?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Impossible d'analyser cette adresse.");
    }

    return (await response.json()) as LocationAnalysisDto;
  },

  /**
   * Mini-synthèses des cards. Second aller-retour, lancé une fois l'analyse affichée :
   * l'écran ne l'attend pas, les phrases s'y insèrent à leur arrivée.
   */
  async generateCardInsights(
    data: LocationAnalysisDto,
    citycode?: string,
  ): Promise<CardInsightsDto> {
    const suffix = citycode ? `?citycode=${encodeURIComponent(citycode)}` : "";
    const response = await fetch(`/api/location/card-insights${suffix}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Impossible de générer les synthèses.");
    }

    return (await response.json()) as CardInsightsDto;
  },
};
