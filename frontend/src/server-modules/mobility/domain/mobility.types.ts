import type { MobilityLabel } from "../../../server-shared/domain/common.types";

export interface TransportStop {
  id: string;
  name: string;
  distanceMeters: number;
  mode: string;
}

export interface Station {
  id: string;
  name: string;
  distanceMeters: number;
  mode: string; // train, métro/RER, rer, metro, ...
}

export interface MobilityAnalysis {
  nearestStops: TransportStop[];
  /** Gares/métros/RER les plus proches, triés par distance (max 5). */
  nearestStations: Station[];
  label: MobilityLabel;
}
