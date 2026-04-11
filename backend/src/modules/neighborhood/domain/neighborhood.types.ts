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
  | "library";

export interface NeighborhoodAnalysis {
  pois: NeighborhoodPoi[];
  score: number;   // 0-100
  label: string;
}
