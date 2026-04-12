export interface GeoJsonGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

export interface UrbanZone {
  code: string; // e.g. "UG"
  label: string; // e.g. "Zone urbaine générale"
  type: string; // e.g. "U" (urbain), "AU" (à urbaniser), "A" (agricole), "N" (naturel)
}

export interface UrbanPrescription {
  label: string;
  type: string; // code typepsc
}

export interface CadastreParcel {
  section: string;
  numero: string;
  contenance: number; // surface in m²
  commune: string;
  codeInsee: string;
  geometry: GeoJsonGeometry;
}

export interface CadastreAnalysis {
  parcel: CadastreParcel | null;
  urbanZone: UrbanZone | null;
  prescriptions: UrbanPrescription[];
}
