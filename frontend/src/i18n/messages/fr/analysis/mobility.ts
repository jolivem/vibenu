/** Ce que regroupe le second bloc de la card, selon les modes de transport présents. */
export type StationsKind =
  | "metroRer"
  | "metro"
  | "rer"
  | "train"
  | "station"
  | "trainMetroRer"
  | "metroAndRer"
  | "stations";

const stationsHeadings: Record<StationsKind, string> = {
  metroRer: "Métro / RER",
  metro: "Métro",
  rer: "RER",
  train: "Gare",
  station: "Station",
  trainMetroRer: "Gare, métro & RER",
  metroAndRer: "Métro & RER",
  stations: "Stations",
};

/** Card « Transports en commun ». Les noms d'arrêts et de gares viennent des données. */
export const mobility = {
  title: "Transports en commun",
  busTitle: "Bus",
  /**
   * Titre du bloc des gares et stations. `nearestOnly` : aucune n'est proche, seule la
   * plus proche est annoncée comme telle.
   */
  stationsTitle: (kind: StationsKind, nearestOnly: boolean) =>
    `${stationsHeadings[kind]}${nearestOnly ? " la plus proche" : ""}`,
};

export type MobilityMessages = typeof mobility;
