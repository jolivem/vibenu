"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAddressSearch } from "@/features/address-search/useAddressSearch";
import type { AddressSuggestionDto } from "@/types/location-analysis";
import { useI18n } from "@/i18n/client";
import { localizedHref } from "@/i18n/locales";
import { seoHubForCitycode } from "@/lib/commune-routing";

export function SearchPanel() {
  const router = useRouter();
  const { locale, search: m } = useI18n();
  const [query, setQuery] = useState("");
  const { results, isLoading, error } = useAddressSearch(query);

  const selectAddress = (address: AddressSuggestionDto) => {
    // Une ville entière (Paris, Lyon, Marseille) → son hub SEO, qui liste les
    // arrondissements : l'analyse ne sait pas la traiter. Toute autre commune, arrondissement
    // compris, → /analyze en mode commune. Cf. `commune-routing.ts`.
    if (address.type === "municipality") {
      const hub = seoHubForCitycode(address.citycode);
      if (hub) {
        router.push(`/commune/${hub.slug}`);
        return;
      }
    }

    const params = new URLSearchParams({
      lat: String(address.latitude),
      lon: String(address.longitude),
      label: address.label,
      city: address.city,
      postcode: address.postcode,
    });
    if (address.type) params.set("type", address.type);
    if (address.citycode) params.set("citycode", address.citycode);

    router.push(localizedHref(locale, "analyze", { query: params.toString() }));
  };

  return (
    <div className="search-panel">
      <input
        className="input"
        placeholder={m.placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {query.trim().length >= 3 && (
        <div className="search-results">
          {isLoading && <p>{m.searching}</p>}
          {error && <p>{m.failed}</p>}
          {!isLoading && !error && results.length === 0 && <p>{m.noResult}</p>}
          {results.map((result) => {
            const typeLabel = result.type ? m.typeLabels[result.type] : null;
            return (
              <button
                key={result.id}
                className={`search-result-item search-result-item--${result.type ?? "address"}`}
                onClick={() => selectAddress(result)}
              >
                <strong>{result.label}</strong>
                <span>
                  {result.postcode} {result.city}
                  {typeLabel && <em className="search-result-type">· {typeLabel}</em>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
