"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAddressSearch } from "@/features/address-search/useAddressSearch";
import type { AddressSuggestionDto } from "@/types/location-analysis";
import { getCommuneByCodeInsee } from "@/lib/commune-slugs";

const TYPE_LABEL: Record<string, string> = {
  housenumber: "Adresse précise",
  street: "Rue",
  locality: "Lieu-dit",
  municipality: "Commune",
};

export function SearchPanel() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { results, isLoading, error } = useAddressSearch(query);

  const selectAddress = (address: AddressSuggestionDto) => {
    // Une commune (saisie sans n° de rue) → page SEO si on l'a, sinon /analyze en mode commune.
    if (address.type === "municipality" && address.citycode) {
      const seoEntry = getCommuneByCodeInsee(address.citycode);
      if (seoEntry) {
        router.push(`/commune/${seoEntry.slug}`);
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

    router.push(`/analyze?${params.toString()}`);
  };

  return (
    <div className="search-panel">
      <input
        className="input"
        placeholder="Adresse, ou nom de commune (ex. Paris 11e, Bordeaux…)"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {query.trim().length >= 3 && (
        <div className="search-results">
          {isLoading && <p>Recherche en cours...</p>}
          {error && <p>{error}</p>}
          {!isLoading && !error && results.length === 0 && <p>Aucune adresse trouvée.</p>}
          {results.map((result) => {
            const typeLabel = result.type ? TYPE_LABEL[result.type] : null;
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
