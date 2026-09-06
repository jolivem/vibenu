export interface NeighborhoodPoi {
  name: string;
  category: PoiCategory;
  distanceMeters: number;
}

export type PoiCategory =
  | "school"
  | "supermarket"
  | "bakery"
  | "pharmacy"
  | "doctor"
  | "park"
  | "sport"
  | "restaurant"
  | "post_office"
  | "bank"
  | "library"
  // Établissements de soins. Contrairement aux autres catégories, ils sont cherchés
  // au-delà du rayon de voisinage quand il n'y en a aucun à proximité : à la campagne,
  // « pas d'hôpital dans les 800 m » n'apprend rien, « hôpital à 13 km » si.
  | "hospital"
  | "emergency";

export interface NeighborhoodAnalysis {
  pois: NeighborhoodPoi[];
  label: string;
}
