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
}

export interface MobilityAnalysis {
  nearestStops: TransportStop[];
  nearestStation?: Station;
  label: MobilityLabel;
}
