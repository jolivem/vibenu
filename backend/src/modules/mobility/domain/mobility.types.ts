import type { MobilityLabel } from "../../../shared/domain/common.types.js";

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

export interface MobilityScoreBreakdown {
  base: number;
  nearestStop: string;
  nearestStopPoints: number;
  station: string;
  stationPoints: number;
  density: string;
  densityPoints: number;
}

export interface MobilityAnalysis {
  nearestStops: TransportStop[];
  nearestStation?: Station;
  score: number;
  label: MobilityLabel;
  scoreBreakdown: MobilityScoreBreakdown;
}
