"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAddressSearch } from "@/features/address-search/useAddressSearch";
import type { AddressSuggestionDto } from "@/types/location-analysis";

export function SearchPanel() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { results, isLoading, error } = useAddressSearch(query);

  const selectAddress = (address: AddressSuggestionDto) => {
    const params = new URLSearchParams({
      lat: String(address.latitude),
      lon: String(address.longitude),
      label: address.label,
      city: address.city,
      postcode: address.postcode,
    });

    router.push(`/analyze?${params.toString()}`);
  };

  return (
    <div className="search-panel">
      <input
        className="input"
        placeholder="Exemple : 10 avenue de Paris, Versailles"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {query.trim().length >= 3 && (
        <div className="search-results">
          {isLoading && <p>Recherche en cours...</p>}
          {error && <p>{error}</p>}
          {!isLoading && !error && results.length === 0 && <p>Aucune adresse trouvée.</p>}
          {results.map((result) => (
            <button key={result.id} className="search-result-item" onClick={() => selectAddress(result)}>
              <strong>{result.label}</strong>
              <span>
                {result.postcode} {result.city}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
