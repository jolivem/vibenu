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

/**
 * Arrêts (bus, tram) et gares (métro, RER, train) dans un rayon, comptés sur les listes
 * complètes : `nearestStops` et `nearestStations` sont tronquées à quelques entrées.
 */
export interface MobilityCounts {
  radiusMeters: number;
  stops: number;
  stations: number;
}

export interface MobilityAnalysis {
  nearestStops: TransportStop[];
  /** Gares/métros/RER les plus proches, triés par distance (max 8). */
  nearestStations: Station[];
  label: MobilityLabel;
  /** `null` quand le provider n'a pas pu compter (API indisponible). */
  counts: MobilityCounts | null;
}
