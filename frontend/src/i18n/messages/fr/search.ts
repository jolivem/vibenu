import type { AddressSuggestionDto } from "@/types/location-analysis";

type SuggestionType = NonNullable<AddressSuggestionDto["type"]>;

/** Panneau de recherche d'adresse (page d'accueil). */
export const search = {
  placeholder: "Adresse, ou nom de commune (ex. Paris 11e, Bordeaux…)",
  searching: "Recherche en cours...",
  noResult: "Aucune adresse trouvée.",
  /** Affiché quand l'API d'adresses ne répond pas. */
  failed: "Impossible de rechercher les adresses.",
  typeLabels: {
    housenumber: "Adresse précise",
    street: "Rue",
    locality: "Lieu-dit",
    municipality: "Commune",
  } satisfies Record<SuggestionType, string> as Record<SuggestionType, string>,
};

export type SearchMessages = typeof search;
